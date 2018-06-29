/* jspsych-video.js
 * Josh de Leeuw
 *
 * This plugin displays a video. The trial ends when the video finishes.
 *
 * documentation: docs.jspsych.org
 *
 */

jsPsych.plugins.video = (function() {

  var plugin = {};

  plugin.info = {
    name: 'video',
    description: '',
    parameters: {
      sources: {
        type: jsPsych.plugins.parameterType.VIDEO,
        pretty_name: 'Sources',
        array: true,
        default: undefined,
        description: 'The video file to play.'
      },
      width: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Width',
        default: undefined,
        description: 'The width of the video in pixels.'
      },
      height: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Height',
        default: undefined,
        description: 'The height of the video display in pixels.'
      },
      autoplay: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Autoplay',
        default: true,
        description: 'If true, the video will begin playing as soon as it has loaded.'
      },
      controls: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Controls',
        default: false,
        description: 'If true, the subject will be able to pause the video or move the playback to any point in the video.'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed below the video content.'
      },
      start: {
        type: jsPsych.plugins.parameterType.FLOAT,
        pretty_name: 'Start',
        default: null,
        description: 'Time to start the clip.'
      },
      stop: {
        type: jsPsych.plugins.parameterType.FLOAT,
        pretty_name: 'Stop',
        default: null,
        description: 'Time to stop the clip.'
      },
      indicateLoading: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Indicate Loading',
        default: false,
        description: 'If true, show a "Loading..." message until the video is ready to play.'
      },
      promptEnableAutoplay: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Prompt to Enable Autoplay',
        default: false,
        description: 'If true, prompt the user to enable autoplay in cases where it is disabled by the browser.'
      }
    }
  }


  plugin.trial = function(display_element, trial) {


    // display stimulus
    var video_html = "";
    
    // add hidden loading indicator if enabled
    if (trial.indicateLoading) {
      video_html += "<p id='jspsych-video-loading' style='display: none;'>Loading...</p>\n";
    }
    
    video_html += '<video id="jspsych-video-player" width="'+trial.width+'" height="'+trial.height+'" '
    if(trial.controls){
      video_html +="controls "
    }
    video_html+=">"
    for(var i=0; i<trial.sources.length; i++){
      var s = trial.sources[i];
      if(s.indexOf('?') > -1){
        s = s.substring(0, s.indexOf('?'));
      }
      var type = s.substr(s.lastIndexOf('.') + 1);
      type = type.toLowerCase();

      // adding start stop parameters if specified
      video_html+='<source src="'+trial.sources[i]

      /*
      // this isn't implemented yet in all browsers, but when it is
      // revert to this way of doing it.

      if (trial.start !== null) {
        video_html+= '#t=' + trial.start;
      } else {
        video_html+= '#t=0';
      }

      if (trial.stop !== null) {
        video_html+= ',' + trial.stop
      }*/

      video_html+='" type="video/'+type+'">';
    }
    video_html +="</video>"

    //show prompt if there is one
    if (trial.prompt !== null) {
      video_html += trial.prompt;
    }
    
    //add hidden autoplay enable prompt if enabled
    if (trial.promptEnableAutoplay) {
      video_html += "<div id='jspsych-video-autoprompt' style='display: none;'><p>Please enable autoplay in your browser, or click the 'Play' button: <button id='jspsych-video-apbutton'>Play</button></p></div>\n";
    }

    display_element.innerHTML = video_html;
    var videoPlayer = display_element.querySelector("#jspsych-video-player");

    // Set the start time
    // NOTE: This gets re-done if the user has to enable autoplay
    if(trial.start !== null){
      videoPlayer.currentTime = trial.start;
    }
    
    // Handle stopping
    var timeUpdateHandler = function(event) {
      var currentTime = videoPlayer.currentTime;
      if (currentTime >= trial.stop) {
        videoPlayer.removeEventListener("timeupdate", timeUpdateHandler);
        end_trial();
      }
    };
    if(trial.stop !== null){
      // If a stop time is specificed, listen for it
      videoPlayer.addEventListener("timeupdate", timeUpdateHandler);
    }
    videoPlayer.addEventListener("ended", function(){
      videoPlayer.removeEventListener("timeupdate", timeUpdateHandler); // In case video ends before stop time is reached
      end_trial();
    });
    
    if (trial.indicateLoading) {
      
      var videoEl = display_element.querySelector('#jspsych-video-player');
      var loadingEl = display_element.querySelector('#jspsych-video-loading');
      
      videoEl.addEventListener("loadstart", function() {
        loadingEl.style.display = 'block';
      });
      
      videoEl.addEventListener("canplaythrough", function() {
        loadingEl.style.display = 'none';
      });
    }
    
    // Start playing a video. If autoplay is disabled by browser and prompting is enabled,
    // prompt the user to enable autoplay or play by hand. Continue until they succeed.
    var attempt_to_play = function() {
      var promise = display_element.querySelector('#jspsych-video-player').play();
      // Desktop Safari now prevents autoplay of certain types of media by default
      if (trial.promptEnableAutoplay && promise !== undefined) {
        var promptEl = display_element.querySelector('#jspsych-video-autoprompt');
        promise.then(function() {
          // Re-set the start time (the browser ignored it the first time)
          if(trial.start !== null){
            videoPlayer.currentTime = trial.start;
          }
          promptEl.style.display = 'none'; // success
        }, function() {
          promptEl.style.display = 'block'; // failure
        });
      }
    }
    
    if (trial.autoplay) {
      // Set up 'Continue' button in autoplay prompt if enabled
      if (trial.promptEnableAutoplay) {
        display_element.querySelector('#jspsych-video-apbutton').onclick = function() {
          attempt_to_play();
        };
      }
      attempt_to_play();
    }

    // function to end trial when it is time
    var end_trial = function() {

      // gather the data to store for the trial
      var trial_data = {
        stimulus: JSON.stringify(trial.sources)
      };

      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    };

  };

  return plugin;
})();

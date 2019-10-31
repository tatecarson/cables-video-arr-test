import './scss/main.scss';

/**
 * Called when there was a cables error.
 * @param {string} errId - ID of the error, e.g. 'NO_WEBGL' or 'NO_WEBAUDIO'
 *                         when the browser does not support the used APIs
 * @param {string} errMsg - The error message
 */
function showError(errId, errMsg) {
  alert('An error occured: ' + errId + ', ' + errMsg);
}

function patchInitialized() {
  // You can now access the patch object (CABLES.patch), register variable watchers and so on
}

function patchFinishedLoading() {
  // The patch is ready now, all assets have been loaded
  let preview = document.getElementById("preview");
  let recording = document.getElementById("recording");
  let startButton = document.getElementById("startButton");
  let stopButton = document.getElementById("stopButton");
  let downloadButton = document.getElementById("downloadButton");
  let logElement = document.getElementById("log");

  let recordingTimeMS = 5000;

  function log(msg) {
    logElement.innerHTML += msg + "\n";
  }

  function wait(delayInMS) {
    return new Promise(resolve => setTimeout(resolve, delayInMS));
  }

  function startRecording(stream, lengthInMS) {
    let recorder = new MediaRecorder(stream);
    let data = [];
    // to group each video i want cables to play
    recorder.ondataavailable = event => data.push(event.data);
    recorder.start();
    log(recorder.state + " for " + (lengthInMS / 1000) + " seconds...");

    let stopped = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = event => reject(event.name);
    });

    let recorded = wait(lengthInMS).then(
      () => recorder.state == "recording" && recorder.stop()
    );

    return Promise.all([
        stopped,
        recorded
      ])
      .then(() => data);
  }

  function stop(stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  
  const videos = [];

  startButton.addEventListener("click", function () {

    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      }).then(stream => {
        console.log(stream)
        preview.srcObject = stream;
        downloadButton.href = stream;
        preview.captureStream = preview.captureStream || preview.mozCaptureStream;
        return new Promise(resolve => preview.onplaying = resolve);
      }).then(() => startRecording(preview.captureStream(), recordingTimeMS))
      .then(recordedChunks => {
        let recordedBlob = new Blob(recordedChunks, {
          type: "video/webm"
        });
        // playback recording outside cables
        recording.src = URL.createObjectURL(recordedBlob);

        // set the variable in cables 
        videos.push(URL.createObjectURL(recordedBlob));
        console.log("videosARR", videos)
        CABLES.patch.setVarValue("videoArr", videos);
        // CABLES.patch.setVariable("videoArr", videos);

        downloadButton.href = recording.src;
        downloadButton.download = "RecordedVideo.webm";

        log("Successfully recorded " + recordedBlob.size + " bytes of " +
          recordedBlob.type + " media.");
      })
      .catch(log);
  }, false);
  stopButton.addEventListener("click", function () {
    stop(preview.srcObject);
  }, false);
}

document.addEventListener('DOMContentLoaded', function (event) {
  CABLES.patch = new window.CABLES.Patch({
    patch: CABLES.exportedPatch,
    prefixAssetPath: 'patch/',
    glCanvasId: 'glcanvas',
    glCanvasResizeToWindow: true,
    onError: showError,
    onPatchLoaded: patchInitialized,
    onFinishedLoading: patchFinishedLoading
  });
});
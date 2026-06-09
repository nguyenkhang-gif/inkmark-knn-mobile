import { setStatus, showToast, showSection } from './ui.js';
import { saveImageToFilesystem } from './filesystem.js';
import { loadGallery } from './gallery.js';

let mediaStream = null;
let snapDataUrl  = null;
let uploadFileObj = null;
let uploadBlobUrl = null;

// ── In-app camera ──────────────────────────────────────────────────────────

window.startCamera = async function() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Camera not available in this browser', 'error');
    return;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    const video = document.getElementById('cameraFeed');
    video.srcObject = mediaStream;
    document.getElementById('cameraWrap').classList.add('active');
    document.getElementById('cameraIdle').style.display = 'none';
    document.getElementById('cameraControls').style.display = 'flex';
  } catch (e) {
    showToast('Camera error: ' + (e.message || e.name), 'error');
  }
};

window.stopCamera = function() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  const video = document.getElementById('cameraFeed');
  video.srcObject = null;
  document.getElementById('cameraWrap').classList.remove('active');
  document.getElementById('cameraIdle').style.display = 'block';
  document.getElementById('cameraControls').style.display = 'none';
};

window.capturePhoto = function() {
  const video  = document.getElementById('cameraFeed');
  const canvas = document.getElementById('cameraCanvas');
  canvas.width  = video.videoWidth  || 1280;
  canvas.height = video.videoHeight || 720;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  snapDataUrl = canvas.toDataURL('image/jpeg', 0.88);

  stopCamera();

  const preview = document.getElementById('preview');
  preview.src = snapDataUrl;
  preview.style.display = 'block';
  document.getElementById('saveRow').style.display = 'flex';
  setStatus('Preview ready — save or retake');
};

window.retakePhoto = async function() {
  snapDataUrl = null;
  document.getElementById('preview').style.display = 'none';
  document.getElementById('saveRow').style.display = 'none';
  setStatus('');
  await window.startCamera();
};

window.discardSnap = function() {
  snapDataUrl = null;
  document.getElementById('preview').style.display = 'none';
  document.getElementById('saveRow').style.display = 'none';
  setStatus('');
};

window.saveNativeSnap = async function() {
  if (!snapDataUrl) return;
  await saveImageToFilesystem(snapDataUrl);
  window.discardSnap();
  loadGallery();
  showSection('images');
};

// ── Upload ─────────────────────────────────────────────────────────────────

window.onDragOver  = (e) => { e.preventDefault(); document.getElementById('dropZone').classList.add('drag-over'); };
window.onDragLeave = ()  => { document.getElementById('dropZone').classList.remove('drag-over'); };
window.onDrop      = (e) => {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) previewUpload(file);
};
window.onFileSelected = (e) => { if (e.target.files[0]) previewUpload(e.target.files[0]); };

function previewUpload(file) {
  if (uploadBlobUrl) URL.revokeObjectURL(uploadBlobUrl);
  uploadFileObj = file;
  uploadBlobUrl = URL.createObjectURL(file);
  const up = document.getElementById('uploadPreview');
  up.src = uploadBlobUrl;
  up.style.display = 'block';
  document.getElementById('uploadBtn').style.display = 'block';
  setStatus('Ready to save');
}

window.uploadFile = async function() {
  if (!uploadFileObj) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    await saveImageToFilesystem(e.target.result);
    if (uploadBlobUrl) { URL.revokeObjectURL(uploadBlobUrl); uploadBlobUrl = null; }
    uploadFileObj = null;
    const up = document.getElementById('uploadPreview');
    up.src = '';
    up.style.display = 'none';
    document.getElementById('uploadBtn').style.display = 'none';
    loadGallery();
    showSection('images');
  };
  reader.readAsDataURL(uploadFileObj);
};

// Stop camera stream when switching away from camera tab
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.input-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (mediaStream) stopCamera();
    });
  });
});

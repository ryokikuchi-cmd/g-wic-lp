/* SP時のみ375px固定ビューポートを適用、PC時は通常ビューポート */
var baseW = 375;
var pcBreakpoint = 850;

function updateMetaViewport() {
  var meta = document.querySelector("meta[name='viewport']");
  if (window.innerWidth >= pcBreakpoint) {
    meta.setAttribute("content", "width=device-width,initial-scale=1.0");
  } else {
    var viewportContent = "width=" + baseW + ",user-scalable=no,shrink-to-fit=yes";
    meta.setAttribute("content", viewportContent);
  }
}

window.addEventListener("resize", updateMetaViewport, false);
window.addEventListener("orientationchange", updateMetaViewport, false);
updateMetaViewport();

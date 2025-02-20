document.addEventListener('DOMContentLoaded', () => {
  const loadingScreen = document.getElementById('loading-screen');
  const fillMask = document.querySelector('.fill-mask');
  const loadingPercentage = document.querySelector('.loading-percentage');
  const imageTrack = document.getElementById('image-track');
  
  let progress = 0;
  const duration = 2000; // 2 seconds
  const startTime = Date.now();

  function updateLoader() {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      progress = Math.min((elapsed / duration) * 100, 100);

      // Calculate mask position (move from bottom to top)
      const maskPosition = 200 - (progress * 2); // 200 is SVG height
      fillMask.setAttribute('y', maskPosition);
      
      loadingPercentage.textContent = `${Math.round(progress)}%`;

      if (progress < 100) {
          requestAnimationFrame(updateLoader);
      } else {
          setTimeout(() => {
              loadingScreen.classList.add('fade-out');
              imageTrack.classList.add('visible');
              
              setTimeout(() => {
                  loadingScreen.style.display = 'none';
              }, 500);
          }, 500);
      }
  }

  // Add clip path to SVG
  const svg = document.getElementById('loading-text');
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
  clipPath.setAttribute("id", "fill-clip");
  
  // Clone the mask rect into the clip path
  const maskClone = fillMask.cloneNode(true);
  clipPath.appendChild(maskClone);
  defs.appendChild(clipPath);
  svg.insertBefore(defs, svg.firstChild);

  // Start the animation
  requestAnimationFrame(updateLoader);
});

const track = document.getElementById("image-track");

const handleOnDown = e => track.dataset.mouseDownAt = e.clientX;

const handleOnUp = () => {
  track.dataset.mouseDownAt = "0";  
  track.dataset.prevPercentage = track.dataset.percentage;
}

const handleOnMove = e => {
  if(track.dataset.mouseDownAt === "0") return;
  
  const mouseDelta = parseFloat(track.dataset.mouseDownAt) - e.clientX;
  const maxDelta = window.innerWidth / 2;
  
  const percentage = (mouseDelta / maxDelta) * -100;
  const nextPercentageUnconstrained = parseFloat(track.dataset.prevPercentage) + percentage;
  const nextPercentage = Math.max(Math.min(nextPercentageUnconstrained, 0), -100);
  
  track.dataset.percentage = nextPercentage;
  
  // Track animation
  track.animate({
    transform: `translate(${nextPercentage}%, -50%)`
  }, { duration: 1200, fill: "forwards" });
  
  // Image animation - this is what creates the parallax effect
  for(const image of track.getElementsByClassName("image")) {
    image.animate({
      objectPosition: `${100 + nextPercentage}% center`
    }, { duration: 1200, fill: "forwards" });
  }
}

window.onmousedown = e => handleOnDown(e);
window.ontouchstart = e => handleOnDown(e.touches[0]);
window.onmouseup = e => handleOnUp(e);
window.ontouchend = e => handleOnUp(e.touches[0]);
window.onmousemove = e => handleOnMove(e);
window.ontouchmove = e => handleOnMove(e.touches[0]);

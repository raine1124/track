document.addEventListener('DOMContentLoaded', () => {
  // Initialize all images to ensure they're visible
  initializeImages();
  
  // Check if animation has already played this session
  if (sessionStorage.getItem('animationPlayed')) {
      // If animation has played, hide loading screen and show content immediately
      const loadingScreen = document.getElementById('loading-screen');
      const imageTrack = document.getElementById('image-track');
      
      loadingScreen.style.display = 'none';
      imageTrack.classList.add('visible');
      return;
  }

  const loadingScreen = document.getElementById('loading-screen');
  const fillRect = document.querySelector('.fill-rect');
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
      fillRect.setAttribute('y', maskPosition);

      if (progress < 100) {
          requestAnimationFrame(updateLoader);
      } else {
          // Mark animation as played in this session
          sessionStorage.setItem('animationPlayed', 'true');
          
          loadingScreen.classList.add('fade-out');
          imageTrack.classList.add('visible');
          
          setTimeout(() => {
              loadingScreen.style.display = 'none';
          }, 500);
      }
  }

  // Start the animation
  requestAnimationFrame(updateLoader);
});

// Function to initialize all images
function initializeImages() {
  const images = document.querySelectorAll('.image');
  images.forEach(img => {
      // Force a reload of the image
      const src = img.src;
      img.src = '';
      setTimeout(() => {
          img.src = src;
      }, 10);
      
      // Reset any transforms
      img.style.transform = '';
  });
}

// Add an event listener for when the page becomes visible again
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
      // Page is now visible again
      initializeImages();
  }
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
  
  // Apply transform only to the track, not individual images
  track.animate({
    transform: `translate(${nextPercentage}%, -50%)`
  }, { duration: 800, fill: "forwards" });
  
  // Remove the image animation part or replace with a non-translating effect
  // if you want a different effect on images
}

// Add a function to handle page navigation
window.addEventListener('pageshow', (event) => {
  // If the page is loaded from the cache (back/forward navigation)
  if (event.persisted) {
      // Reinitialize images
      initializeImages();
      
      // Reset track position
      if (track) {
          track.style.transform = 'translate(0%, -50%)';
          track.dataset.percentage = "0";
          track.dataset.prevPercentage = "0";
          track.dataset.mouseDownAt = "0";
      }
  }
});

window.onmousedown = e => handleOnDown(e);
window.ontouchstart = e => handleOnDown(e.touches[0]);
window.onmouseup = e => handleOnUp(e);
window.ontouchend = e => handleOnUp(e.touches[0]);
window.onmousemove = e => handleOnMove(e);
window.ontouchmove = e => handleOnMove(e.touches[0]);

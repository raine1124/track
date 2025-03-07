document.addEventListener('DOMContentLoaded', () => {
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

// Function to reset image transforms and ensure visibility
function resetImageStyles() {
    const images = document.querySelectorAll('.image');
    images.forEach(img => {
        // Reset any transforms and ensure visibility
        img.style.transform = '';
        img.style.opacity = '1';
        img.style.display = 'block';
    });
}

// Add an event listener for when the page becomes visible again
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Page is now visible again
        resetImageStyles();
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
    
    // Track animation - using a very short duration for immediate response
    track.animate({
        transform: `translate(${nextPercentage}%, -50%)`
    }, { duration: 800, fill: "forwards" });
    
    // Image animation - also using a very short duration
    for(const image of track.getElementsByClassName("image")) {
        // Calculate a parallax effect - images move at a different rate than the track
        const parallaxFactor = 0.5; // Adjust this value to control the parallax effect
        const imageTranslate = nextPercentage * parallaxFactor;
        
        // Use the Web Animation API for smooth animation during drag
        image.animate({
            transform: `translateX(${imageTranslate}%)`
        }, { duration: 800, fill: "forwards" });
    }
}

// Add a function to handle page navigation
window.addEventListener('pageshow', (event) => {
    // If the page is loaded from the cache (back/forward navigation)
    if (event.persisted) {
        // Reset image styles
        resetImageStyles();
        
        // Reset track position
        if (track) {
            track.style.transform = 'translate(0%, -50%)';
            track.dataset.percentage = "0";
            track.dataset.prevPercentage = "0";
            track.dataset.mouseDownAt = "0";
        }
    }
});

// Add a specific fix for the brain image
window.addEventListener('load', () => {
    // Ensure the brain image is properly displayed
    const brainImage = document.querySelector('img[src*="brain.png"]');
    if (brainImage) {
        brainImage.style.display = 'block';
        brainImage.style.opacity = '1';
    }
});
  
window.onmousedown = e => handleOnDown(e);
window.ontouchstart = e => handleOnDown(e.touches[0]);
window.onmouseup = e => handleOnUp(e);
window.ontouchend = e => handleOnUp(e.touches[0]);
window.onmousemove = e => handleOnMove(e);
window.ontouchmove = e => handleOnMove(e.touches[0]);

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('email-vote-form');
    const emailInput = document.getElementById('email-input');
    const voteButtons = document.querySelectorAll('.vote-button');
    const submitButton = document.getElementById('submit-button');
    const formMessage = document.getElementById('form-message');
    const voteInput = document.getElementById('vote-input');
    
    let selectedOption = null;
    
    // Handle vote button selection
    voteButtons.forEach(button => {
        button.addEventListener('click', function() {
            voteButtons.forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');
            selectedOption = this.getAttribute('data-option');
            voteInput.value = selectedOption;
        });
    });
    
    // Handle form submission
    form.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        if (!emailInput.value || !selectedOption) {
            formMessage.textContent = 'Please enter a valid email and select an option.';
            return;
        }

        // Show submitting message
        formMessage.textContent = 'Submitting...';
        
        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: {
                    'Accept': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.ok) {
                // Success
                formMessage.textContent = 'Email and Vote Received, Thank You.';
                formMessage.classList.remove('fade-out'); // Ensure the message is visible
                form.reset();
                voteButtons.forEach(btn => btn.classList.remove('selected'));
                selectedOption = null;

                // Fade out the message after 3 seconds
                setTimeout(() => {
                    formMessage.classList.add('fade-out');
                    // Remove the message from the DOM after the fade-out transition completes
                    setTimeout(() => {
                        formMessage.textContent = '';
                        formMessage.classList.remove('fade-out');
                    }, 1000); // Wait for the fade-out transition to complete (1 second)
                }, 3000); // 3000 milliseconds = 3 seconds
            } else {
                // Error from Formspree
                formMessage.textContent = 'There was an error submitting the form. Please try again.';
            }
        } catch (error) {
            // Network or other error
            formMessage.textContent = 'There was an error submitting the form. Please try again.';
        }
    });
});

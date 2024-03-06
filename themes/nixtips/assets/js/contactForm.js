export const setupContactForm = (Alpine) =>
  Alpine.data('contactForm', () => {
    return {
      formData: {
        fullName: '',
        email: '',
        message: '',
        privacy: '',
      },
      formMessage: '',
      formAction: 'https://formspree.io/f/xqkrlabn',
      submitForm() {
        this.formMessage = ''
        fetch(this.formAction, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(this.formData),
        })
          .then(() => {
            this.formData.fullName = ''
            this.formData.email = ''
            this.formData.message = ''
            this.formData.privacy = false
            this.formMessage = "Thank you! We received your message and we'll get in touch shortly."
          })
          .catch(() => {
            this.formMessage =
              'Oops! Something went wrong when submitting your message. Please try again.'
          })
      },
    }
  })

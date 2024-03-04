import '../css/styles.css'
import Alpine from 'alpinejs'
import { setupContactForm } from './contactForm'
import { setupPricing } from './pricing'
import { setupFaqs } from './faqs'
import { setup3dPlot } from './3d/3d.js'

setupPricing(Alpine)
setupFaqs(Alpine)
setupContactForm(Alpine)
setup3dPlot(Alpine)

Alpine.start()

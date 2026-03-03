import { MessageCircle } from 'lucide-react';

// WhatsApp Support Number
const WHATSAPP_NUMBER = '+447449858053';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=Hello%20Jarnnmarket%20Support%2C%20I%20need%20help%20with...`;

export const WhatsAppButton = () => {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105 group"
      data-testid="whatsapp-floating-btn"
      aria-label="Contact us on WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
      <span className="hidden group-hover:inline-block transition-all text-sm font-medium">
        Need Help?
      </span>
    </a>
  );
};

export default WhatsAppButton;

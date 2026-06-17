import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

export default function FloatingSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const supportPhone = '+1 202 209 9465';
  const supportPhoneLink = 'sms:+12022099465';

  const handleSMSClick = () => {
    window.location.href = supportPhoneLink;
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Support Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {isOpen && (
          <div className="absolute bottom-20 right-0 bg-navy-card border border-accent/20 rounded-2xl p-4 w-72 shadow-lg shadow-accent/10 animate-in fade-in slide-in-from-bottom-2 mb-2">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">Support</h3>
                <p className="text-xs text-white/60 mb-3">Need help? Contact us via SMS</p>
              </div>
              
              <button
                onClick={handleSMSClick}
                className="w-full bg-accent hover:bg-accent/95 text-white text-xs font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Send SMS to {supportPhone}
              </button>
              
              <p className="text-[10px] text-white/40 text-center">
                Click to open your default SMS app
              </p>
            </div>
          </div>
        )}
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-accent hover:bg-accent/95 text-white rounded-full p-4 shadow-lg shadow-accent/20 transition transform hover:scale-110 flex items-center justify-center"
          aria-label="Support"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </button>
      </div>
    </>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  HelpCircle, 
  ShoppingCart, 
  Truck, 
  CreditCard, 
  Shield, 
  UserCheck, 
  Package,
  MessageCircle,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

const WHATSAPP_LINK = 'https://wa.me/447449858053?text=Hello%20Jarnnmarket%20Support%2C%20I%20need%20help%20with...';

const FAQ_CATEGORIES = [
  {
    id: 'buying',
    title: 'Buying',
    icon: ShoppingCart,
    faqs: [
      {
        question: 'How do I place a bid on an auction?',
        answer: 'To place a bid, first verify your phone number in your dashboard. Then browse auctions, click on an item you\'re interested in, and enter your bid amount. Your bid must be higher than the current highest bid. You\'ll be notified if you\'re outbid.'
      },
      {
        question: 'What is "Buy Now"?',
        answer: 'Buy Now allows you to purchase an item instantly at a fixed price set by the seller, without waiting for the auction to end. Not all listings have this option - look for the "Buy Now" button on the auction page.'
      },
      {
        question: 'How do I make an offer?',
        answer: 'Some listings accept offers. If you see "Make an Offer" on an auction page, you can propose a price lower than the asking price. The seller will receive your offer and can accept or reject it.'
      },
      {
        question: 'What happens when I win an auction?',
        answer: 'When you win an auction, you\'ll receive a notification and email. Go to your dashboard to complete payment. Once paid, the funds are held in escrow until you confirm delivery of the item.'
      },
      {
        question: 'Can I cancel a bid?',
        answer: 'Generally, bids cannot be cancelled once placed. Please make sure you\'re committed to purchasing before bidding. If you have exceptional circumstances, contact our support team.'
      }
    ]
  },
  {
    id: 'selling',
    title: 'Selling',
    icon: Package,
    faqs: [
      {
        question: 'How do I become a seller?',
        answer: 'Register as a "Farmer" when creating your account. Verify your phone number, and you can start creating auctions immediately. Consider subscribing to a seller plan for additional features and listing capacity.'
      },
      {
        question: 'What fees does Jarnnmarket charge?',
        answer: 'Jarnnmarket charges a small commission on successful sales. Check our seller subscription plans for details on fees, listing limits, and premium features available to subscribers.'
      },
      {
        question: 'How do I create an auction?',
        answer: 'Go to your dashboard and click "Create Auction". Fill in the product details, upload high-quality images (minimum 400x300 pixels), set your starting bid, and choose delivery options. You can also enable "Buy Now" or "Accept Offers" features.'
      },
      {
        question: 'When do I get paid?',
        answer: 'After a buyer completes payment, funds are held in escrow for security. Once the buyer confirms delivery, the funds are released. You can then request a payout from your dashboard.'
      },
      {
        question: 'What are seller subscription plans?',
        answer: 'Subscription plans unlock features like more listings, analytics, priority support, and a verified seller badge. We offer 5-day, weekly, and monthly plans to fit your needs.'
      }
    ]
  },
  {
    id: 'payments',
    title: 'Payments',
    icon: CreditCard,
    faqs: [
      {
        question: 'What payment methods are accepted?',
        answer: 'We accept payments through Stripe (credit/debit cards) and PayPal. All transactions are secured with industry-standard encryption.'
      },
      {
        question: 'What currencies are supported?',
        answer: 'Jarnnmarket supports USD (US Dollars) and NGN (Nigerian Naira). Sellers can list items in either currency.'
      },
      {
        question: 'What is escrow protection?',
        answer: 'Escrow protects both buyers and sellers. When you pay, funds are held securely by Jarnnmarket until you confirm receipt of your item. This ensures sellers ship items and buyers receive what they paid for.'
      },
      {
        question: 'How do refunds work?',
        answer: 'If there\'s an issue with your order, contact support before confirming delivery. Refunds are processed case-by-case. See our Return Policy for details.'
      },
      {
        question: 'How long do payouts take?',
        answer: 'Once a buyer confirms delivery, sellers can request a payout immediately. Payouts are typically processed within 1-3 business days depending on your payment method.'
      }
    ]
  },
  {
    id: 'delivery',
    title: 'Delivery',
    icon: Truck,
    faqs: [
      {
        question: 'What delivery options are available?',
        answer: 'Sellers can offer Local Pickup (collect from seller), City-to-City delivery within Nigeria, and International Shipping. Check each listing for available options and estimated delivery times.'
      },
      {
        question: 'How do I track my order?',
        answer: 'Once the seller ships your order, they\'ll provide tracking information. Check your dashboard or the order details page for tracking updates.'
      },
      {
        question: 'What if my item doesn\'t arrive?',
        answer: 'Don\'t confirm delivery until you receive your item! If there are shipping issues, contact support. Your payment is protected in escrow until delivery is confirmed.'
      },
      {
        question: 'Can I change my delivery address?',
        answer: 'Contact the seller directly through the platform before they ship. Once shipped, address changes may not be possible.'
      }
    ]
  },
  {
    id: 'account',
    title: 'Account & Verification',
    icon: UserCheck,
    faqs: [
      {
        question: 'Why do I need to verify my email?',
        answer: 'Email verification ensures we can reach you with important notifications about your bids, auctions, and purchases. You must verify your email before logging in.'
      },
      {
        question: 'Why do I need to verify my phone number?',
        answer: 'Phone verification is mandatory for bidding and selling. It helps prevent fraud and ensures secure communication between buyers and sellers.'
      },
      {
        question: 'I didn\'t receive my verification code. What do I do?',
        answer: 'Check your spam folder for emails. For SMS, ensure your phone number is entered correctly with country code. You can request a new code after a short wait. Contact support if issues persist.'
      },
      {
        question: 'How do I change my account details?',
        answer: 'Go to your dashboard to update your profile information. Some changes (like email) may require re-verification.'
      }
    ]
  },
  {
    id: 'security',
    title: 'Security & Trust',
    icon: Shield,
    faqs: [
      {
        question: 'Is my payment information safe?',
        answer: 'Yes! We use Stripe and PayPal for payment processing. We never store your full card details on our servers. All transactions use SSL encryption.'
      },
      {
        question: 'How does the review system work?',
        answer: 'After confirming delivery, buyers can leave reviews for sellers. This builds trust in the community and helps other buyers make informed decisions.'
      },
      {
        question: 'What if I encounter a fraudulent seller?',
        answer: 'Report suspicious activity immediately through our support channels. Never confirm delivery until you\'ve received and inspected your item. Escrow protection keeps your money safe.'
      },
      {
        question: 'How do I report a problem?',
        answer: 'Contact our support team via WhatsApp, email, or phone. Provide your order details and description of the issue. We aim to resolve all disputes fairly and quickly.'
      }
    ]
  }
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredFAQs = FAQ_CATEGORIES.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq => 
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => 
    (activeCategory === 'all' || category.id === activeCategory) &&
    category.faqs.length > 0
  );

  const totalResults = filteredFAQs.reduce((sum, cat) => sum + cat.faqs.length, 0);

  return (
    <div className="min-h-screen bg-background" data-testid="help-center-page">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Help Center
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Find answers to common questions or contact our support team
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg rounded-full"
              data-testid="help-search"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={() => setActiveCategory('all')}
          >
            All Topics
          </Button>
          {FAQ_CATEGORIES.map(category => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => setActiveCategory(category.id)}
            >
              <category.icon className="w-4 h-4 mr-1" />
              {category.title}
            </Button>
          ))}
        </div>

        {/* Search Results Count */}
        {searchQuery && (
          <p className="text-center text-muted-foreground mb-6">
            Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
        )}

        {/* FAQ Sections */}
        {filteredFAQs.length > 0 ? (
          <div className="space-y-8">
            {filteredFAQs.map(category => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <category.icon className="w-5 h-5 text-primary" />
                    </div>
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {category.faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`${category.id}-${index}`}>
                        <AccordionTrigger className="text-left hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <HelpCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4">
              Try different keywords or contact our support team
            </p>
            <Button onClick={() => setSearchQuery('')} variant="outline">
              Clear Search
            </Button>
          </div>
        )}

        {/* Contact Section */}
        <div className="mt-16">
          <h2 
            className="text-2xl font-bold text-center mb-8"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Still Need Help?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="pt-8 pb-6">
                <a 
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                    <MessageCircle className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">WhatsApp Support</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chat with us for quick assistance
                  </p>
                  <Button className="rounded-full bg-green-600 hover:bg-green-700">
                    Start Chat
                  </Button>
                </a>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="pt-8 pb-6">
                <a href="mailto:info@jarnnmarket.com">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Email Support</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    info@jarnnmarket.com
                  </p>
                  <Button variant="outline" className="rounded-full">
                    Send Email
                  </Button>
                </a>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="pt-8 pb-6">
                <a href="tel:+2348189275367">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
                    <Phone className="w-7 h-7 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Phone Support</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    +234 818 927 5367
                  </p>
                  <Button variant="outline" className="rounded-full">
                    Call Now
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Location */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Abia State, Nigeria</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-16 text-center">
          <h3 className="font-semibold mb-4">Quick Links</h3>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/policies/terms">
              <Button variant="ghost" size="sm">Terms & Conditions</Button>
            </Link>
            <Link to="/policies/privacy">
              <Button variant="ghost" size="sm">Privacy Policy</Button>
            </Link>
            <Link to="/policies/return">
              <Button variant="ghost" size="sm">Return Policy</Button>
            </Link>
            <Link to="/policies/seller">
              <Button variant="ghost" size="sm">Seller Guidelines</Button>
            </Link>
            <Link to="/policies/buyer">
              <Button variant="ghost" size="sm">Buyer Guidelines</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

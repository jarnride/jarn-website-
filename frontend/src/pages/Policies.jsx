import { Link, useParams, Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Shield, FileText, RefreshCw, Scale, Users, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const POLICY_TYPES = ['terms', 'privacy', 'return', 'seller', 'buyer'];

export default function Policies() {
  const { type } = useParams();
  
  // Default to terms if no type specified or invalid type
  const activeType = POLICY_TYPES.includes(type) ? type : 'terms';
  
  return (
    <div className="min-h-screen bg-muted/30" data-testid="policies-page">
      {/* Header */}
      <div className="bg-primary text-white py-12">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <h1 
            className="text-3xl md:text-4xl font-bold mb-2"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Policies & Guidelines
          </h1>
          <p className="text-white/70">
            Important information about using jarnnmarket
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <Tabs value={activeType} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2 bg-transparent p-0">
            <Link to="/policies/terms">
              <TabsTrigger 
                value="terms" 
                className="w-full data-[state=active]:bg-primary data-[state=active]:text-white"
                data-testid="tab-terms"
              >
                <FileText className="w-4 h-4 mr-2" />
                Terms
              </TabsTrigger>
            </Link>
            <Link to="/policies/privacy">
              <TabsTrigger 
                value="privacy" 
                className="w-full data-[state=active]:bg-primary data-[state=active]:text-white"
                data-testid="tab-privacy"
              >
                <Shield className="w-4 h-4 mr-2" />
                Privacy
              </TabsTrigger>
            </Link>
            <Link to="/policies/return">
              <TabsTrigger 
                value="return" 
                className="w-full data-[state=active]:bg-primary data-[state=active]:text-white"
                data-testid="tab-return"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Returns
              </TabsTrigger>
            </Link>
            <Link to="/policies/seller">
              <TabsTrigger 
                value="seller" 
                className="w-full data-[state=active]:bg-primary data-[state=active]:text-white"
                data-testid="tab-seller"
              >
                <Users className="w-4 h-4 mr-2" />
                Seller
              </TabsTrigger>
            </Link>
            <Link to="/policies/buyer">
              <TabsTrigger 
                value="buyer" 
                className="w-full data-[state=active]:bg-primary data-[state=active]:text-white"
                data-testid="tab-buyer"
              >
                <Scale className="w-4 h-4 mr-2" />
                Buyer
              </TabsTrigger>
            </Link>
          </TabsList>

          {/* Terms & Conditions */}
          <TabsContent value="terms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <FileText className="w-6 h-6 text-primary" />
                  Terms and Conditions
                </CardTitle>
                <p className="text-sm text-muted-foreground">Last updated: December 2025</p>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ScrollArea className="h-[600px] pr-4">
                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h3>
                    <p className="text-muted-foreground mb-4">
                      By accessing and using jarnnmarket (&quot;the Platform&quot;), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">2. User Registration</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>You must be at least 18 years old to use this platform</li>
                      <li>You must provide accurate and complete registration information</li>
                      <li>Phone verification is mandatory for all users before participating in auctions</li>
                      <li>You are responsible for maintaining the confidentiality of your account</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">3. Auction Rules</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>All bids are legally binding commitments to purchase</li>
                      <li>Sellers must accurately describe products and provide high-quality images</li>
                      <li>Bid sniping and bid manipulation are prohibited</li>
                      <li>jarnnmarket reserves the right to cancel suspicious auctions</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">4. Payment Terms</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Payments are processed through secure third-party providers (Stripe, PayPal)</li>
                      <li>All funds are held in escrow until delivery confirmation</li>
                      <li>Sellers receive payment after buyer confirms receipt</li>
                      <li>Platform fees may apply to successful transactions</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">5. Prohibited Items</h3>
                    <p className="text-muted-foreground mb-2">The following items are prohibited from being sold on jarnnmarket:</p>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Illegal substances or controlled items</li>
                      <li>Counterfeit or stolen goods</li>
                      <li>Items that violate intellectual property rights</li>
                      <li>Hazardous materials</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">6. Dispute Resolution</h3>
                    <p className="text-muted-foreground">
                      Disputes between buyers and sellers should first be resolved directly. If resolution is not possible, jarnnmarket will mediate based on provided evidence. Our decision is final in all dispute matters.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">7. Limitation of Liability</h3>
                    <p className="text-muted-foreground">
                      jarnnmarket provides a platform for transactions but is not responsible for the quality, safety, or legality of items sold. We are not liable for any indirect, incidental, or consequential damages arising from platform use.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">8. Contact Information</h3>
                    <p className="text-muted-foreground">
                      For questions about these terms, contact us at:<br />
                      Email: info@jarnnmarket.com<br />
                      Phone: +2348189275367
                    </p>
                  </section>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Policy */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <Shield className="w-6 h-6 text-primary" />
                  Privacy Policy
                </CardTitle>
                <p className="text-sm text-muted-foreground">Last updated: December 2025</p>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ScrollArea className="h-[600px] pr-4">
                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">1. Information We Collect</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Personal Information</h4>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                          <li>Name, email address, phone number</li>
                          <li>Account credentials (encrypted)</li>
                          <li>Location information for listings</li>
                          <li>Payment information (processed securely by third parties)</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Usage Information</h4>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                          <li>Browsing history on the platform</li>
                          <li>Auction and bidding activity</li>
                          <li>Device information and IP addresses</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">2. How We Use Your Information</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>To provide and improve our services</li>
                      <li>To process transactions and send notifications</li>
                      <li>To verify user identity (phone verification)</li>
                      <li>To prevent fraud and ensure platform security</li>
                      <li>To communicate updates and marketing (with consent)</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">3. Information Sharing</h3>
                    <p className="text-muted-foreground mb-4">We do not sell your personal information. We may share data with:</p>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Payment processors (Stripe, PayPal) for transactions</li>
                      <li>SMS providers for verification</li>
                      <li>Other users as necessary for transactions (limited info)</li>
                      <li>Law enforcement when required by law</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">4. Data Security</h3>
                    <p className="text-muted-foreground">
                      We implement industry-standard security measures including encryption, secure connections (HTTPS), and regular security audits. Passwords are hashed using bcrypt. However, no method of transmission over the internet is 100% secure.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">5. Your Rights</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Access and download your personal data</li>
                      <li>Request correction of inaccurate data</li>
                      <li>Request deletion of your account and data</li>
                      <li>Opt-out of marketing communications</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">6. Cookies</h3>
                    <p className="text-muted-foreground">
                      We use essential cookies for authentication and platform functionality. By using jarnnmarket, you consent to our use of cookies.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">7. Changes to Privacy Policy</h3>
                    <p className="text-muted-foreground">
                      We may update this policy periodically. Significant changes will be communicated via email or platform notification. Continued use after changes constitutes acceptance.
                    </p>
                  </section>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Return Policy */}
          <TabsContent value="return">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <RefreshCw className="w-6 h-6 text-primary" />
                  Return & Refund Policy
                </CardTitle>
                <p className="text-sm text-muted-foreground">Last updated: December 2025</p>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Important Notice</p>
                        <p className="text-sm text-amber-700">
                          Due to the perishable nature of agricultural products, return policies may vary. Always review seller-specific policies before purchasing.
                        </p>
                      </div>
                    </div>
                  </div>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">1. Escrow Protection</h3>
                    <p className="text-muted-foreground mb-4">
                      All payments on jarnnmarket are held in escrow until the buyer confirms delivery. This protects both parties:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
                        <p className="font-medium text-green-800">For Buyers</p>
                        <p className="text-sm text-green-700">Funds are released only after you confirm receipt</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Shield className="w-5 h-5 text-blue-600 mb-2" />
                        <p className="font-medium text-blue-800">For Sellers</p>
                        <p className="text-sm text-blue-700">Guaranteed payment once delivery is confirmed</p>
                      </div>
                    </div>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">2. Eligibility for Refunds</h3>
                    <p className="text-muted-foreground mb-3">Refunds may be issued in the following cases:</p>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Item significantly different from description</li>
                      <li>Item damaged during shipping (with photo evidence)</li>
                      <li>Item not delivered within agreed timeframe</li>
                      <li>Quality below acceptable standards (spoiled produce)</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">3. Refund Process</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <Badge className="bg-primary text-white">1</Badge>
                        <div>
                          <p className="font-medium">Report Issue</p>
                          <p className="text-sm text-muted-foreground">Contact seller within 24 hours of receiving the item</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <Badge className="bg-primary text-white">2</Badge>
                        <div>
                          <p className="font-medium">Provide Evidence</p>
                          <p className="text-sm text-muted-foreground">Submit photos and description of the issue</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <Badge className="bg-primary text-white">3</Badge>
                        <div>
                          <p className="font-medium">Resolution</p>
                          <p className="text-sm text-muted-foreground">Seller responds within 48 hours, or jarnnmarket mediates</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <Badge className="bg-primary text-white">4</Badge>
                        <div>
                          <p className="font-medium">Refund Issued</p>
                          <p className="text-sm text-muted-foreground">Funds returned to original payment method within 5-7 days</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">4. Non-Refundable Situations</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Change of mind after purchase</li>
                      <li>Items used or consumed</li>
                      <li>Issues reported after 48 hours of delivery</li>
                      <li>Natural variation in agricultural products (minor size/color differences)</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">5. Dispute Timeline</h3>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Disputes must be raised within 7 days of delivery confirmation</span>
                    </div>
                  </section>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Seller Policy */}
          <TabsContent value="seller">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <Users className="w-6 h-6 text-primary" />
                  Seller Guidelines & Policy
                </CardTitle>
                <p className="text-sm text-muted-foreground">Last updated: December 2025</p>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ScrollArea className="h-[600px] pr-4">
                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">1. Seller Requirements</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Phone Verification (Mandatory)</p>
                          <p className="text-sm text-muted-foreground">All sellers must verify their phone number before listing</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">High-Quality Images</p>
                          <p className="text-sm text-muted-foreground">Minimum 400x300 pixels, clear product photos required</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Accurate Descriptions</p>
                          <p className="text-sm text-muted-foreground">Honest product details including quantity, quality, and origin</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">2. Listing Guidelines</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Use clear, accurate titles (5-200 characters)</li>
                      <li>Provide detailed descriptions of your produce</li>
                      <li>Set fair starting prices and Buy Now prices</li>
                      <li>Specify accurate location for pickup/delivery</li>
                      <li>Choose appropriate auction duration (6 hours to 1 week)</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">3. Listing Types</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <Badge className="mb-2">Auction</Badge>
                        <p className="text-sm text-muted-foreground">Allow buyers to bid competitively. Best for unique or bulk items.</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <Badge variant="secondary" className="mb-2">Buy Now Only</Badge>
                        <p className="text-sm text-muted-foreground">Fixed price, no bidding. Best for standard products with known value.</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <Badge variant="outline" className="mb-2">Accept Offers</Badge>
                        <p className="text-sm text-muted-foreground">Allow buyers to make offers. Good for flexible pricing.</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <Badge variant="outline" className="mb-2">Auction + Buy Now</Badge>
                        <p className="text-sm text-muted-foreground">Combine bidding with instant purchase option.</p>
                      </div>
                    </div>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">4. Fulfillment & Shipping</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Ship within 24-48 hours of payment confirmation</li>
                      <li>Use appropriate packaging for perishable items</li>
                      <li>Provide tracking information when available</li>
                      <li>Communicate any delays promptly to buyers</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">5. Payout Process</h3>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 mb-4">
                      <p className="font-medium text-green-800 mb-2">Escrow-Protected Payments</p>
                      <p className="text-sm text-green-700">
                        Payments are held in escrow until the buyer confirms delivery. Once confirmed, you can request a payout from your dashboard.
                      </p>
                    </div>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Payouts are processed within 3-5 business days</li>
                      <li>Ensure your payment details are up to date</li>
                      <li>Platform fees may be deducted from final amount</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">6. Seller Responsibilities</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Respond to buyer inquiries within 24 hours</li>
                      <li>Honor all confirmed sales and accepted offers</li>
                      <li>Maintain good seller ratings (aim for 4+ stars)</li>
                      <li>Resolve disputes professionally and promptly</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">7. Account Suspension</h3>
                    <p className="text-muted-foreground">
                      Seller accounts may be suspended for repeated policy violations, fraudulent activity, consistently low ratings, or failure to fulfill orders. Appeals can be made to info@jarnnmarket.com.
                    </p>
                  </section>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buyer Policy */}
          <TabsContent value="buyer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <Scale className="w-6 h-6 text-primary" />
                  Buyer Guidelines & Policy
                </CardTitle>
                <p className="text-sm text-muted-foreground">Last updated: December 2025</p>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ScrollArea className="h-[600px] pr-4">
                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">1. Buyer Requirements</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Phone Verification (Mandatory)</p>
                          <p className="text-sm text-muted-foreground">Verify your phone to participate in auctions and purchases</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Valid Payment Method</p>
                          <p className="text-sm text-muted-foreground">Credit/debit card or PayPal account for transactions</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">2. Bidding Rules</h3>
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">Binding Commitment</p>
                          <p className="text-sm text-amber-700">
                            All bids are legally binding. Only bid if you intend to complete the purchase.
                          </p>
                        </div>
                      </div>
                    </div>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Bids must be higher than the current highest bid</li>
                      <li>Cannot bid on your own auctions</li>
                      <li>Cannot retract bids once placed</li>
                      <li>Winning bidders must complete payment within 48 hours</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">3. Buying Options</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <Badge className="mb-2">Place Bid</Badge>
                        <p className="text-sm text-muted-foreground">Compete with others for the best price</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <Badge variant="secondary" className="mb-2">Buy Now</Badge>
                        <p className="text-sm text-muted-foreground">Instant purchase at fixed price</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <Badge variant="outline" className="mb-2">Make Offer</Badge>
                        <p className="text-sm text-muted-foreground">Propose your price to the seller</p>
                      </div>
                    </div>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">4. Payment & Escrow</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Secure payment processing via Stripe or PayPal</li>
                      <li>Funds held in escrow until delivery confirmation</li>
                      <li>Only release payment when satisfied with the product</li>
                      <li>Report issues before confirming delivery</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">5. Delivery Confirmation</h3>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                      <p className="font-medium text-blue-800 mb-2">Before Confirming Delivery:</p>
                      <ul className="list-disc pl-6 text-sm text-blue-700 space-y-1">
                        <li>Inspect the product for quality and accuracy</li>
                        <li>Check quantity matches the listing</li>
                        <li>Take photos if there are any issues</li>
                        <li>Contact seller immediately if problems arise</li>
                      </ul>
                    </div>
                    <p className="text-muted-foreground">
                      Once you confirm delivery, funds are released to the seller and refunds become more difficult. Only confirm when fully satisfied.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">6. Leaving Reviews</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Leave honest, fair reviews after transactions</li>
                      <li>Rate based on product quality, communication, and delivery</li>
                      <li>Reviews help other buyers make informed decisions</li>
                      <li>Fraudulent or abusive reviews may be removed</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">7. Buyer Protections</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>Escrow protection on all transactions</li>
                      <li>Dispute resolution support</li>
                      <li>Refund eligibility for significant issues</li>
                      <li>Seller rating visibility before purchase</li>
                    </ul>
                  </section>

                  <section className="mb-8">
                    <h3 className="text-lg font-semibold mb-3">8. Prohibited Behavior</h3>
                    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                      <li>False claims or fraudulent refund requests</li>
                      <li>Harassing or threatening sellers</li>
                      <li>Creating multiple accounts to manipulate bids</li>
                      <li>Failing to pay for won auctions repeatedly</li>
                    </ul>
                  </section>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

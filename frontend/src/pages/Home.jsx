import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import AuctionCard from '@/components/AuctionCard';
import { ArrowRight, TrendingUp, Users, ShieldCheck, Leaf, Star, Quote } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Home() {
  const navigate = useNavigate();
  const [featuredAuctions, setFeaturedAuctions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Seed demo data first
        await axios.post(`${API}/seed`).catch(() => {});
        
        const [auctionsRes, categoriesRes] = await Promise.all([
          axios.get(`${API}/auctions/featured?limit=6`),
          axios.get(`${API}/auctions/categories`)
        ]);
        
        setFeaturedAuctions(auctionsRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const successStories = [
    {
      quote: "Jarnnmarket helped me sell my tomato harvest at 40% above market price. The direct connection to buyers changed my farming business.",
      author: "John Mwangi",
      role: "Vegetable Farmer, Nairobi",
      image: "https://images.unsplash.com/photo-1628492058844-589eb5dc6a35?crop=entropy&cs=srgb&fm=jpg&q=85&w=100"
    },
    {
      quote: "As a buyer, I love the transparency. I know exactly where my produce comes from and can trust the quality.",
      author: "Sarah Ochieng",
      role: "Restaurant Owner, Mombasa",
      image: "https://images.pexels.com/photos/32277759/pexels-photo-32277759.jpeg?w=100"
    }
  ];

  return (
    <div data-testid="home-page">
      {/* Hero Section */}
      <section className="hero-section grain-overlay" data-testid="hero-section">
        <div 
          className="hero-bg"
          style={{ 
            backgroundImage: `url(https://images.unsplash.com/photo-1754810940905-19a8d26f870e?crop=entropy&cs=srgb&fm=jpg&q=85)` 
          }}
        />
        <div className="hero-overlay absolute inset-0" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 py-20">
          <div className="hero-content text-white animate-fade-in-up">
            <Badge className="mb-6 bg-white/20 text-white border-none backdrop-blur-sm">
              <Leaf className="w-3 h-3 mr-1" />
              Farm Fresh • Direct Trade
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Sell Your Produce<br />
              <span className="text-harvest">Today</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-xl">
              Connect directly with buyers through real-time auctions. 
              Get fair prices for your harvest.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                className="rounded-full bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg font-semibold btn-hover-lift"
                onClick={() => navigate('/auctions')}
                data-testid="hero-browse-btn"
              >
                Browse Auctions
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="rounded-full border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-6 text-lg font-semibold"
                onClick={() => navigate('/auth?mode=register')}
                data-testid="hero-sell-btn"
              >
                Start Selling
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section - Replacing Stats */}
      <section className="py-12 bg-secondary/30 border-y border-primary/10" data-testid="value-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="stat-card animate-fade-in-up stagger-1">
              <div className="stat-value text-primary"><ShieldCheck className="w-8 h-8 mx-auto" /></div>
              <div className="stat-label">Secure Payments</div>
            </div>
            <div className="stat-card animate-fade-in-up stagger-2">
              <div className="stat-value text-primary"><TrendingUp className="w-8 h-8 mx-auto" /></div>
              <div className="stat-label">Best Prices</div>
            </div>
            <div className="stat-card animate-fade-in-up stagger-3">
              <div className="stat-value text-primary"><Leaf className="w-8 h-8 mx-auto" /></div>
              <div className="stat-label">Farm Fresh</div>
            </div>
            <div className="stat-card animate-fade-in-up stagger-4">
              <div className="stat-value text-primary"><Users className="w-8 h-8 mx-auto" /></div>
              <div className="stat-label">Direct From Farmers</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Auctions */}
      <section className="py-20 md:py-32" data-testid="featured-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Featured Auctions
              </h2>
              <p className="text-muted-foreground">Discover fresh produce from local farmers</p>
            </div>
            <Link to="/auctions">
              <Button variant="outline" className="rounded-full hidden md:flex" data-testid="view-all-btn">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="spinner" />
            </div>
          ) : featuredAuctions.length > 0 ? (
            <Carousel opts={{ align: 'start', loop: true }} className="w-full">
              <CarouselContent className="-ml-4">
                {featuredAuctions.map((auction) => (
                  <CarouselItem key={auction.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <AuctionCard auction={auction} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-4 bg-white shadow-lg" />
              <CarouselNext className="-right-4 bg-white shadow-lg" />
            </Carousel>
          ) : (
            <div className="empty-state">
              <p className="text-muted-foreground">No auctions available yet. Be the first to create one!</p>
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Link to="/auctions">
              <Button variant="outline" className="rounded-full">
                View All Auctions
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 md:py-32 bg-muted/30" data-testid="categories-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Browse by Category
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore our diverse range of agricultural products
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {categories.slice(0, 6).map((category, index) => (
              <Link 
                key={category.name}
                to={`/auctions?category=${category.name}`}
                className={`category-card animate-fade-in-up stagger-${index + 1}`}
                data-testid={`category-${category.name.toLowerCase()}`}
              >
                <img src={category.image} alt={category.name} loading="lazy" />
                <div className="category-overlay category-card-content">
                  <h3 className="text-xl md:text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {category.name}
                  </h3>
                  <p className="text-sm text-white/70">{category.count} active auctions</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 md:py-32" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Why Choose Jarnnmarket?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're revolutionizing how farmers sell and buyers source fresh produce
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-secondary/30 p-8 rounded-2xl border border-primary/10 hover:border-primary/30 transition-colors card-hover">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                Fair Market Prices
              </h3>
              <p className="text-muted-foreground">
                Real-time bidding ensures you get the best price for your produce, eliminating middlemen.
              </p>
            </div>

            <div className="bg-secondary/30 p-8 rounded-2xl border border-primary/10 hover:border-primary/30 transition-colors card-hover">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                Direct Connections
              </h3>
              <p className="text-muted-foreground">
                Connect directly with farmers or buyers. Build lasting relationships and trust.
              </p>
            </div>

            <div className="bg-secondary/30 p-8 rounded-2xl border border-primary/10 hover:border-primary/30 transition-colors card-hover">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                Secure Payments
              </h3>
              <p className="text-muted-foreground">
                Safe, fast payments through Stripe. Your money is protected every step of the way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 md:py-32 bg-muted/30" data-testid="stories-section">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Success Stories
            </h2>
            <p className="text-muted-foreground">Hear from our community of farmers and buyers</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {successStories.map((story, index) => (
              <div key={index} className="success-story-card animate-fade-in-up" style={{ animationDelay: `${index * 0.2}s` }}>
                <Quote className="w-10 h-10 text-primary/20 mb-4" />
                <p className="success-story-quote text-foreground">
                  "{story.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <img 
                    src={story.image} 
                    alt={story.author} 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold">{story.author}</p>
                    <p className="text-sm text-muted-foreground">{story.role}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-harvest text-harvest" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-primary text-white" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            Ready to Start Trading?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands of farmers and buyers on Africa's leading agricultural marketplace.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              size="lg" 
              className="rounded-full bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg font-semibold btn-hover-lift"
              onClick={() => navigate('/auth?mode=register&role=farmer')}
              data-testid="cta-farmer-btn"
            >
              Register as Farmer
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="rounded-full border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-6 text-lg font-semibold"
              onClick={() => navigate('/auth?mode=register&role=buyer')}
              data-testid="cta-buyer-btn"
            >
              Register as Buyer
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

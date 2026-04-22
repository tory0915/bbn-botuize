import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../firebase';
import { Product, OrderItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../AppContext';

export default function ProductsPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addToCart } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const q = query(collection(db, 'products'), where('isActive', '==', true), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setProduct({ id: doc.id, ...doc.data() } as Product);
        }
      } catch (error) {
        console.error("Error fetching product", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>;
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">Coming Soon</h1>
        <p className="text-slate-500 max-w-md text-sm">We are currently preparing our exclusive product for you. Please check back later or log into your admin account to release the collection.</p>
      </div>
    );
  }

  const images = (product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls : [product.imageUrl];

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  const handleAddToCart = () => {
    if (!product.id) return;
    const item: OrderItem = {
      productId: product.id,
      name: product.name,
      size: 'One Size',
      price: product.price,
      quantity: 1
    };
    addToCart(item);
    navigate('/cart');
  };

  return (
    <div className="min-h-[80vh] flex flex-col lg:flex-row items-center gap-12 lg:gap-24 px-0 sm:px-8 lg:px-4 py-8">
      {/* Product Image Section */}
      <div className="w-full lg:w-1/2 relative aspect-[4/5] lg:aspect-[3/4] bg-slate-50 rounded-2xl overflow-hidden shadow-sm border border-slate-100 group selection:bg-transparent">
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent z-10 pointer-events-none"></div>
        <img
          src={images[currentImageIndex] || 'https://placehold.co/800x1000?text=No+Image'}
          alt={product.name}
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />

        {images.length > 1 && (
          <>
            {/* Invisible touch targets */}
            <div 
              className="absolute left-0 top-0 w-1/2 h-full z-20 cursor-pointer" 
              onClick={prevImage}
              title="Previous Image"
            ></div>
            <div 
              className="absolute right-0 top-0 w-1/2 h-full z-20 cursor-pointer" 
              onClick={nextImage}
              title="Next Image"
            ></div>

            {/* Arrows */}
            <button 
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/90 text-black opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-white/90 text-black opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-sm hover:scale-105 active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-6 left-0 w-full flex justify-center space-x-2 z-30 pointer-events-none">
              {images.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'bg-black w-4' : 'bg-black/30 w-1.5'}`} 
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Product Information Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center py-4 lg:py-0">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">
          Exclusive Release
        </p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tighter leading-tight mb-6">
          {product.name}
        </h1>
        <p className="text-2xl sm:text-3xl font-medium text-slate-900 mb-8 border-b border-slate-100 pb-8">
          {Math.round(product.price).toLocaleString()} KRW
        </p>
        
        <div className="prose prose-sm sm:prose text-slate-600 leading-relaxed mb-10 max-w-lg">
          <p>{product.description}</p>
        </div>

        <div className="space-y-4 max-w-md w-full">
          <div className="flex items-center justify-between border border-slate-200 rounded-md p-4 bg-white text-[11px] font-bold text-slate-500 uppercase tracking-widest shadow-sm">
            <span>Size</span>
            <span className="text-black">One Size (Free)</span>
          </div>
          
          <button
            onClick={handleAddToCart}
            className="w-full bg-black text-white rounded-md py-5 text-sm sm:text-base font-semibold tracking-widest active:scale-[0.98] transition-transform hover:bg-slate-900 shadow-md"
          >
            ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
}

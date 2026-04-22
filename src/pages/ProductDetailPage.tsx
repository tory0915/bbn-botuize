import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../firebase';
import { Product, OrderItem } from '../types';
import { useAppContext } from '../AppContext';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useAppContext();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(data);
        }
      } catch (error) {
        console.error("Error fetching product", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>;
  if (!product) return <div className="text-center py-12 text-gray-500">Product not found</div>;

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
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
      <div className="max-w-2xl mx-auto py-8 px-4 sm:py-12 sm:px-6 lg:max-w-7xl lg:px-10 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
        <div className="aspect-[3/4] rounded-lg overflow-hidden lg:block bg-slate-50 relative border border-slate-100 shadow-[inset_0_0_20px_rgba(0,0,0,0.02)] group selection:bg-transparent">
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none z-10"></div>
          
          <img
            src={images[currentImageIndex] || 'https://placehold.co/800x1000?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-center object-cover"
            referrerPolicy="no-referrer"
          />

          {images.length > 1 && (
            <>
              {/* Invisible touch targets for intuitive clicking */}
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

              {/* Visible Arrow Controls (appear on hover) */}
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

              {/* Progress Indicators */}
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
        <div className="sm:py-8 flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">New Arrival</p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{product.name}</h1>
          <p className="mt-4 text-xl font-medium text-slate-900">{Math.round(product.price).toLocaleString()} KRW</p>
          
          <div className="mt-8 border-t border-slate-100 pt-8">
            <h3 className="sr-only">Description</h3>
            <div className="text-sm text-slate-600 leading-relaxed space-y-6">
              <p>{product.description}</p>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="mt-10 w-full bg-black text-white rounded-md py-4 text-sm font-semibold active:scale-[0.98] transition-transform shadow-sm hover:bg-slate-900"
          >
            ADD TO CART
          </button>
        </div>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ShoppingCart, LogOut } from 'lucide-react';
import { AppProvider, useAppContext } from './AppContext';
import { signInWithGoogle, logOut } from './firebase';
import { ErrorBoundary } from './ErrorBoundary';

// Placeholders for Pages
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import OrdersPage from './pages/OrdersPage';
import AdminPage from './pages/AdminPage';

function Navbar() {
  const { currentUser, appUser, loading, cart } = useAppContext();

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="font-bold text-xl tracking-tighter text-black">ItsJustBBN</span>
            </Link>
            <div className="flex ml-4 sm:ml-10 space-x-4 sm:space-x-8">
              <Link to="/" className="border-transparent text-slate-500 hover:text-black inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors">쇼핑하기</Link>
              {currentUser && <Link to="/orders" className="border-transparent text-slate-500 hover:text-black inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors hidden sm:inline-flex">내 주문내역</Link>}
              {(appUser?.role === 'admin' || currentUser?.email === 'wedaeho89@gmail.com') && <Link to="/admin" className="border-transparent text-slate-500 hover:text-black inline-flex items-center px-1 pt-1 text-[13px] sm:text-sm font-bold text-red-600 transition-colors">관리자</Link>}
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/cart" className="relative text-slate-600 hover:text-black transition-colors">
              <ShoppingCart className="h-5 w-5" strokeWidth={2} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                  {cart.length}
                </span>
              )}
            </Link>
            {!loading && !currentUser ? (
              <button onClick={signInWithGoogle} className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md text-white bg-black hover:bg-slate-800 transition-colors">
                로그인
              </button>
            ) : !loading && currentUser ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-slate-700 hidden sm:block">{currentUser.displayName}</span>
                <button onClick={logOut} className="text-slate-400 hover:text-black transition-colors" title="로그아웃">
                  <LogOut className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-[#F9FAFB] font-sans text-slate-900">
            <Navbar />
            <main className="max-w-7xl mx-auto py-10 sm:px-6 lg:px-10">
              <Routes>
                <Route path="/" element={<ProductsPage />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/admin/*" element={<AdminPage />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}


import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Trash2, CreditCard, Truck, ShoppingBag, X } from 'lucide-react';
import DaumPostcodeEmbed from 'react-daum-postcode';
import QRCode from 'react-qr-code';
import { db } from '../firebase';
import { useAppContext } from '../AppContext';

export default function CartPage() {
  const { cart, removeFromCart, clearCart, currentUser } = useAppContext();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchQR = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'payment'));
        if (snap.exists()) {
          setQrBase64(snap.data().qrCodeBase64);
        }
      } catch (err) {
        console.error("Failed to load QR", err);
      }
    };
    fetchQR();
  }, []);
  
  // Shipping Form State
  const [shippingInfo, setShippingInfo] = useState({
    recipientName: '',
    phone: '',
    zipCode: '',
    address: '',
    detailAddress: ''
  });
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleNextStep = () => {
    if (!currentUser) {
      alert("결제를 진행하려면 로그인해 주세요.");
      return;
    }
    if (step === 0) setStep(1);
    else if (step === 1) {
      // Validate
      if (!shippingInfo.recipientName || !shippingInfo.phone || !shippingInfo.address || !shippingInfo.detailAddress) {
        alert("배송지 정보를 모두 입력해주세요.");
        return;
      }
      setStep(2);
    }
  };

  const handlePostcodeComplete = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    setShippingInfo(prev => ({
      ...prev,
      zipCode: data.zonecode,
      address: fullAddress,
    }));
    setIsPostcodeOpen(false);
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    setError(null);

    try {
      // Simulate final checking
      await new Promise(r => setTimeout(r, 1500));
      
      // Generate an easily readable ID: ORD-260422-4512
      const date = new Date();
      // Ensure KST time roughly for date
      const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, '');
      const random4 = Math.floor(1000 + Math.random() * 9000);
      const orderId = `ORD-${yymmdd}-${random4}`;

      const orderRef = doc(db, 'orders', orderId);

      const orderData = {
        userId: currentUser!.uid,
        items: cart,
        totalAmount: total,
        status: 'pending',
        shippingInfo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(orderRef, orderData);
      clearCart();
      navigate('/orders');

    } catch (err: any) {
      console.error(err);
      setError(err.message || '결제 혹은 주문 생성에 실패했습니다.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cart.length === 0 && step === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-4">장바구니가 비어 있습니다</h2>
        <Link to="/" className="text-slate-600 font-medium hover:text-black">
          쇼핑 계속하기 &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white px-4 py-8 sm:px-6 sm:py-12 lg:px-10 border border-slate-200 rounded-lg shadow-sm">
      
      {/* Stepper Header */}
      <div className="mb-10 flex items-center justify-center space-x-4 sm:space-x-8">
        <div className={`flex flex-col items-center ${step >= 0 ? 'text-black' : 'text-slate-400'}`}>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${step >= 0 ? 'bg-black text-white' : 'bg-slate-100'}`}>
            <ShoppingBag className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold tracking-wider uppercase">장바구니</span>
        </div>
        <div className="h-px w-8 sm:w-16 bg-slate-200 mb-6"></div>
        <div className={`flex flex-col items-center ${step >= 1 ? 'text-black' : 'text-slate-400'}`}>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${step >= 1 ? 'bg-black text-white' : 'bg-slate-100'}`}>
            <Truck className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold tracking-wider uppercase">배송지 입력</span>
        </div>
        <div className="h-px w-8 sm:w-16 bg-slate-200 mb-6"></div>
        <div className={`flex flex-col items-center ${step >= 2 ? 'text-black' : 'text-slate-400'}`}>
          <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 ${step >= 2 ? 'bg-black text-white' : 'bg-slate-100'}`}>
            <CreditCard className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold tracking-wider uppercase">결제진행</span>
        </div>
      </div>

      {step === 0 && (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-8">장바구니 내역</h1>
          <div className="mt-8">
            <div className="flow-root">
              <ul role="list" className="-my-6 divide-y divide-slate-100">
                {cart.map((item, index) => (
                  <li key={`${item.productId}-${index}`} className="py-6 flex">
                    <div className="flex-shrink-0 w-24 h-24 border border-slate-100 rounded-md overflow-hidden bg-slate-50 flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent z-10 pointer-events-none"></div>
                      <span className="text-slate-400 text-[10px] font-semibold text-center px-2">{item.name}</span>
                    </div>

                    <div className="ml-4 flex-1 flex flex-col justify-center">
                      <div>
                        <div className="flex justify-between text-sm font-semibold text-slate-900">
                          <h3>{item.name}</h3>
                          <p className="ml-4">{Math.round(item.price * item.quantity).toLocaleString()} KRW</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">사이즈: {item.size}</p>
                      </div>
                      <div className="flex-1 flex items-end justify-between text-sm mt-2">
                        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">수량 {item.quantity}</p>

                        <div className="flex">
                          <button
                            type="button"
                            onClick={() => removeFromCart(index)}
                            className="font-medium text-slate-400 hover:text-red-500 flex items-center transition-colors text-xs uppercase tracking-wider"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-10 pt-8">
            <div className="flex justify-between text-base font-bold text-slate-900">
              <p>총 상품금액</p>
              <p>{Math.round(total).toLocaleString()} KRW</p>
            </div>
            <div className="mt-8">
              <button
                onClick={handleNextStep}
                className="w-full flex justify-center items-center px-6 py-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-black hover:bg-slate-900 transition-colors"
              >
                배송지 입력하기 &rarr;
              </button>
            </div>
            {!currentUser && (
              <p className="mt-4 text-center text-xs text-amber-600 font-semibold uppercase tracking-wider">
                결제를 위해 먼저 로그인을 해주세요.
              </p>
            )}
          </div>
        </>
      )}

      {step === 1 && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6">배송지 정보 입력</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">수령인 성함</label>
              <input 
                type="text" 
                value={shippingInfo.recipientName}
                onChange={e => setShippingInfo({...shippingInfo, recipientName: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-md focus:ring-1 focus:ring-black outline-none text-sm"
                placeholder="홍길동"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">휴대폰 번호</label>
              <input 
                type="text" 
                value={shippingInfo.phone}
                onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-md focus:ring-1 focus:ring-black outline-none text-sm"
                placeholder="010-1234-5678"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">주소</label>
              <div className="flex space-x-2 mb-2">
                <input 
                  type="text" 
                  readOnly
                  value={shippingInfo.zipCode}
                  className="w-1/3 p-3 border border-slate-200 rounded-md bg-slate-50 text-sm outline-none"
                  placeholder="우편번호"
                />
                <button 
                  type="button"
                  onClick={() => setIsPostcodeOpen(true)}
                  className="bg-slate-200 text-slate-800 px-4 py-2 rounded-md font-semibold text-xs transition-colors hover:bg-slate-300 uppercase tracking-wider"
                >
                  주소 찾기
                </button>
              </div>
              
              {isPostcodeOpen && (
                <div className="border border-slate-200 p-2 mb-2 rounded-md relative shadow-sm">
                  <button 
                    onClick={() => setIsPostcodeOpen(false)}
                    className="absolute top-2 right-2 z-10 bg-white border border-slate-200 p-1 rounded-full shadow-sm cursor-pointer hover:bg-slate-50"
                  >
                    <X className="h-4 w-4 text-slate-600" />
                  </button>
                  <DaumPostcodeEmbed onComplete={handlePostcodeComplete} style={{ height: '300px' }} />
                </div>
              )}

              <input 
                type="text" 
                readOnly
                value={shippingInfo.address}
                className="w-full p-3 border border-slate-200 rounded-md mb-2 bg-slate-50 text-sm outline-none"
                placeholder="기본 주소"
              />
              <input 
                type="text" 
                value={shippingInfo.detailAddress}
                onChange={e => setShippingInfo({...shippingInfo, detailAddress: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-md focus:ring-1 focus:ring-black outline-none text-sm"
                placeholder="나머지 상세 주소를 입력해주세요"
              />
            </div>

            <div className="pt-6 flex justify-between">
              <button 
                onClick={() => setStep(0)}
                className="px-6 py-3 border border-slate-200 rounded-md text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                &larr; 뒤로가기
              </button>
              <button 
                onClick={handleNextStep}
                className="px-8 py-3 bg-black text-white rounded-md font-semibold text-sm hover:bg-slate-800 transition-colors"
              >
                결제수단 선택 &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">QR 코드로 입금하기</h2>
          <p className="text-sm text-slate-500 mb-8">아래 QR코드를 카메라 앱이나 은행 앱으로 스캔하시어 입금해주시면 확인 후 주문이 완료처리됩니다.</p>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl inline-block mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-black"></div>
            <div className="mb-4 flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Payment QR Code</span>
              <div className="w-48 h-48 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 overflow-hidden">
                <img 
                  src={qrBase64 || "/qr-payment.png"} 
                  alt="결제 QR코드" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    if (!qrBase64) {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Please+Upload+QR+Code';
                    }
                  }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-slate-900">{Math.round(total).toLocaleString()} KRW</p>
              <p className="text-xs text-slate-600 font-medium">우리은행 1002457995062 (위대호)</p>
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-500 p-4 mb-4 rounded-md text-sm font-medium">{error}</div>}

          <div className="flex flex-col space-y-3">
             <button
               onClick={handleCheckout}
               disabled={isCheckingOut}
               className="w-full flex justify-center items-center px-6 py-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-black hover:bg-slate-900 transition-all active:scale-[0.98] disabled:bg-slate-400 disabled:cursor-not-allowed"
             >
               {isCheckingOut ? '주문 처리 중...' : '입금 완료 및 주문 접수'}
             </button>
             <button 
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-slate-200 rounded-md text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                주소 수정하기
             </button>
          </div>
        </div>
      )}

    </div>
  );
}

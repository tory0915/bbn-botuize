import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppContext } from '../AppContext';
import { Order } from '../types';
import { Link } from 'react-router-dom';

export default function OrdersPage() {
  const { currentUser } = useAppContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        // Sort manually by date since requiring an index might delay viewing
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(data);
      } catch (error) {
        console.error("Error fetching orders", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [currentUser]);

  if (!currentUser) {
    return <div className="text-center py-20">주문 내역을 보려면 로그인해 주세요.</div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-8 tracking-tight">내 주문내역</h1>
      {orders.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-500 mb-4 text-sm font-medium">아직 주문한 내역이 없습니다.</p>
          <Link to="/" className="text-black font-semibold hover:underline text-sm uppercase tracking-wider">쇼핑 시작하기</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <div key={order.id} className="border border-slate-100 rounded-lg overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center sm:items-start border-b border-slate-100">
                <div className="mb-3 sm:mb-0 text-center sm:text-left">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">주문 번호</p>
                  <p className="text-sm font-semibold text-slate-900">{order.id}</p>
                  <p className="text-xs text-slate-500 mt-1">주문일자: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '날짜 확인 불가'}</p>
                </div>
                <div className="flex space-x-6 items-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold
                    ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                      order.status === 'processing' ? 'bg-slate-200 text-slate-800' : 
                      order.status === 'shipped' ? 'bg-slate-800 text-white' : 
                      'bg-slate-100 text-slate-600'}
                  `}>
                    {order.status === 'pending' ? '결제 대기' :
                     order.status === 'processing' ? '상품 준비중' :
                     order.status === 'shipped' ? '배송 중' :
                     order.status === 'delivered' ? '배송 완료' : order.status}
                  </span>
                  <div>
                     <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">총 결제금액</p>
                     <p className="text-sm font-bold text-slate-900 text-right">{Math.round(order.totalAmount).toLocaleString()} KRW</p>
                  </div>
                </div>
              </div>
              <ul role="list" className="divide-y divide-slate-100 px-6">
                {order.items.map((item, index) => (
                  <li key={index} className="py-5 flex">
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium">사이즈: {item.size} <span className="mx-2 text-slate-300">|</span> 수량: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{Math.round(item.price * item.quantity).toLocaleString()} KRW</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

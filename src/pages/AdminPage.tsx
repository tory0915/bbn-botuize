import React, { useEffect, useState, useRef } from 'react';
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Trash2, Upload } from 'lucide-react';
import { db } from '../firebase';
import { useAppContext } from '../AppContext';
import { Product, Order } from '../types';

export default function AdminPage() {
  const { appUser, currentUser, loading: authLoading } = useAppContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', description: '', price: 0, imageUrl: '', imageUrls: [], sizes: ['One Size'], isActive: true
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [qrDragOver, setQrDragOver] = useState(false);
  const [currentQr, setCurrentQr] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      if (appUser?.role !== 'admin' && currentUser?.email !== 'wedaeho89@gmail.com') {
        setLoading(false);
        return;
      }
      try {
        const prodSnap = await getDocs(collection(db, 'products'));
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
        
        const ordSnap = await getDocs(collection(db, 'orders'));
        const ords = ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
        ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(ords);

        const qrSnap = await getDoc(doc(db, 'settings', 'payment'));
        if (qrSnap.exists()) {
          setCurrentQr(qrSnap.data().qrCodeBase64);
        }
      } catch (error) {
        console.error("Admin fetch error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [appUser, currentUser, authLoading]);

  if (authLoading || loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>;
  }

  if (appUser?.role !== 'admin' && currentUser?.email !== 'wedaeho89@gmail.com') {
    return <div className="text-center py-20 text-red-500 font-bold">Unauthorized. Admin access only.</div>;
  }

  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            reject(new Error("Canvas context error"));
          }
        };
        img.onerror = () => reject(new Error("Invalid image"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Error reading file"));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await processImageFile(files[i]);
        newUrls.push(url);
      }
      
      setNewProduct(prev => {
        const currentUrls = prev.imageUrls || [];
        const updatedUrls = [...currentUrls, ...newUrls];
        return {
          ...prev,
          imageUrls: updatedUrls,
          imageUrl: currentUrls.length === 0 ? updatedUrls[0] : prev.imageUrl
        };
      });
    } catch (err) {
      console.error(err);
      alert("Error processing images");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setNewProduct(prev => {
      const updatedUrls = [...(prev.imageUrls || [])];
      updatedUrls.splice(index, 1);
      return {
        ...prev,
        imageUrls: updatedUrls,
        imageUrl: updatedUrls.length > 0 ? updatedUrls[0] : ''
      };
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    
    try {
      if (editingProduct) {
        // Update existing product
        const productData = {
          ...newProduct,
          imageUrls: newProduct.imageUrls || (newProduct.imageUrl ? [newProduct.imageUrl] : [])
        };
        // Remove undefined id
        delete productData.id;
        
        await updateDoc(doc(db, 'products', editingProduct.id!), productData);
        setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...productData } as Product : p));
        setEditingProduct(null);
      } else {
        // Create new product
        const id = `prod_${Date.now()}`;
        const productData = {
          ...(newProduct as Product),
          imageUrls: newProduct.imageUrls || (newProduct.imageUrl ? [newProduct.imageUrl] : []),
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'products', id), productData);
        setProducts([...products, { id, ...(newProduct as Product), createdAt: new Date().toISOString() }]);
      }
      
      setIsAdding(false);
      setNewProduct({ name: '', description: '', price: 0, imageUrl: '', imageUrls: [], sizes: ['One Size'], isActive: true });
    } catch (error) {
      console.error(error);
      alert("Failed to save product. Please check console for errors.");
    }
  };

  const startEditing = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({ 
      ...product,
      imageUrls: product.imageUrls || (product.imageUrl ? [product.imageUrl] : [])
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setEditingProduct(null);
    setNewProduct({ name: '', description: '', price: 0, imageUrl: '', imageUrls: [], sizes: ['One Size'], isActive: true });
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const uDate = new Date().toISOString();
      await updateDoc(doc(db, 'orders', orderId), { status, updatedAt: uDate });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: status as any, updatedAt: uDate } : o));
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("정말로 이 주문내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(orders.filter(o => o.id !== orderId));
    } catch (err) {
      console.error(err);
      alert("주문 삭제에 실패했습니다.");
    }
  };

  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    setQrDragOver(false);
    
    let file: File | null = null;
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files[0];
    } else if ('target' in e && e.target.files) {
      file = e.target.files[0];
    }

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        await setDoc(doc(db, 'settings', 'payment'), { qrCodeBase64: base64 }, { merge: true });
        setCurrentQr(base64);
        alert('QR 코드가 성공적으로 업데이트되었습니다.');
      } catch (err) {
        console.error(err);
        alert('업데이트 중 오류가 발생했습니다.');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Store Settings</h2>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4">Payment QR Code</label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-48 h-48 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {currentQr ? (
                <img src={currentQr} alt="Current QR" className="w-full h-full object-contain" />
              ) : (
                <p className="text-xs text-slate-400 font-medium">No QR Code</p>
              )}
            </div>
            <div className="flex-1 w-full">
              <div
                onDragOver={(e) => { e.preventDefault(); setQrDragOver(true); }}
                onDragLeave={() => setQrDragOver(false)}
                onDrop={handleQRUpload}
                onClick={() => qrInputRef.current?.click()}
                className={`
                  w-full flex flex-col justify-center items-center rounded-lg border border-dashed px-6 py-12 transition-colors cursor-pointer
                  ${qrDragOver ? 'border-black bg-slate-50' : 'border-slate-300 hover:border-slate-400'}
                `}
              >
                <Upload className="h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-700">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 1MB</p>
              </div>
              <input
                type="file"
                ref={qrInputRef}
                className="sr-only"
                accept="image/*"
                onChange={handleQRUpload}
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Products ({products.length})</h2>
          <button onClick={isAdding ? cancelAdding : () => setIsAdding(true)} className="bg-black text-white px-4 py-2 rounded-md hover:bg-slate-800 text-sm font-semibold transition-colors">
            {isAdding ? 'CANCEL' : 'ADD PRODUCT'}
          </button>
        </div>
        
        {isAdding && (
          <form onSubmit={handleSaveProduct} className="bg-white p-6 rounded-xl mb-8 border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Name</label>
                <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="mt-1 block w-full rounded-md border border-slate-200 outline-none focus:ring-1 focus:ring-black p-3 text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Price</label>
                <input required type="number" step="0.01" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} className="mt-1 block w-full rounded-md border border-slate-200 outline-none focus:ring-1 focus:ring-black p-3 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
                <textarea required value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="mt-1 block w-full rounded-md border border-slate-200 outline-none focus:ring-1 focus:ring-black p-3 text-sm" rows={3}></textarea>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Product Images</label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    mt-1 flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 transition-colors cursor-pointer
                    ${dragOver ? 'border-black bg-slate-50' : 'border-slate-300 hover:border-slate-400'}
                  `}
                >
                  <div className="text-center w-full">
                    {uploadingImage ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
                        <p className="text-sm text-slate-500">Uploading images...</p>
                      </div>
                    ) : (newProduct.imageUrls && newProduct.imageUrls.length > 0) ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="flex flex-wrap gap-4 justify-center mb-4">
                          {newProduct.imageUrls.map((url, idx) => (
                            <div key={idx} className="relative group">
                              <img src={url} alt={`Preview ${idx + 1}`} className="h-24 w-24 object-cover rounded-md shadow-sm border border-slate-200" />
                              <button 
                                type="button" 
                                onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 group-hover:text-black">Click or drag more images to append</p>
                      </div>
                    ) : (
                      <>
                        <svg className="mx-auto h-12 w-12 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <div className="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                          <span className="relative rounded-md bg-white font-semibold text-black focus-within:outline-none focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2 hover:text-slate-800">
                            Upload multiple files
                          </span>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs leading-5 text-slate-500">PNG, JPG, GIF up to 5MB</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="sr-only"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        handleImageUpload(e.target.files);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <button type="submit" className="mt-6 bg-black text-white px-6 py-3 rounded-md hover:bg-slate-800 text-sm font-semibold transition-colors">SAVE PRODUCT</button>
          </form>
        )}

        <div className="bg-white shadow-sm overflow-hidden sm:rounded-xl border border-slate-200">
          <ul className="divide-y divide-slate-100">
            {products.map(p => (
              <li key={p.id} className="px-6 py-5 flex items-center justify-between">
                <div className="flex items-center">
                  <img src={p.imageUrl} alt="" className="h-12 w-12 rounded-md object-cover mr-4 border border-slate-100" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{Math.round(p.price).toLocaleString()} KRW</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{p.isActive ? 'Active' : 'Inactive'}</div>
                  <button 
                    onClick={() => startEditing(p)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded transition-colors font-semibold"
                  >
                    Edit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-6">Recent Orders</h2>
        <div className="bg-white shadow-sm overflow-hidden sm:rounded-xl border border-slate-200">
          <ul className="divide-y divide-slate-100">
            {orders.map(o => (
              <li key={o.id} className="px-6 py-5">
                <div className="flex justify-between items-start">
                   <div>
                     <p className="text-sm font-semibold text-slate-900 line-clamp-1">{o.id}</p>
                     <p className="text-xs text-slate-400 mt-1">User: {o.userId}</p>
                     <div className="mt-4 bg-slate-50 p-4 rounded-md border border-slate-100 text-xs">
                        <p className="font-bold text-slate-700 mb-2 uppercase tracking-wider">배송 정보 (Shipping Info)</p>
                        {o.shippingInfo ? (
                          <div className="space-y-1">
                            <p><span className="text-slate-500 w-16 inline-block">수령인:</span> <span className="font-semibold text-slate-900">{o.shippingInfo.recipientName}</span></p>
                            <p><span className="text-slate-500 w-16 inline-block">연락처:</span> <span className="font-medium text-slate-900">{o.shippingInfo.phone}</span></p>
                            <p><span className="text-slate-500 w-16 inline-block">주소:</span> <span className="font-medium text-slate-900">[{o.shippingInfo.zipCode}] {o.shippingInfo.address} {o.shippingInfo.detailAddress}</span></p>
                          </div>
                        ) : (
                          <p className="text-slate-400">배송지 정보가 없습니다 (구버전 주문)</p>
                        )}
                     </div>
                   </div>
                   <div className="flex flex-col items-end space-y-3">
                     <div className="flex items-center space-x-3">
                       <span className="text-sm font-bold text-slate-900">{Math.round(o.totalAmount).toLocaleString()} KRW</span>
                       <button onClick={() => handleDeleteOrder(o.id!)} className="text-slate-400 hover:text-red-500 transition-colors" title="주문 삭제">
                         <Trash2 className="h-4 w-4" />
                       </button>
                     </div>
                     <select 
                       value={o.status} 
                       onChange={(e) => updateOrderStatus(o.id!, e.target.value)}
                       className="text-xs rounded-md border border-slate-200 py-1.5 pl-2 pr-6 outline-none focus:ring-1 focus:ring-black cursor-pointer font-medium uppercase tracking-wide text-slate-600"
                     >
                       <option value="pending">Pending</option>
                       <option value="processing">Processing</option>
                       <option value="shipped">Shipped</option>
                       <option value="delivered">Delivered</option>
                     </select>
                   </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

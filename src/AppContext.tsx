import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User as AppUser, OrderItem } from './types';

interface AppContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  cart: OrderItem[];
  addToCart: (item: OrderItem) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<OrderItem[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Sync user in Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        let localRole: 'user' | 'admin' = 'user';
        if (user.email === 'wedaeho89@gmail.com') {
           localRole = 'admin';
        }

        if (userSnap.exists()) {
          const data = userSnap.data() as AppUser;
          // Force admin role if it's the admin email and it was previously saved as 'user'
          if (user.email === 'wedaeho89@gmail.com' && data.role !== 'admin') {
            data.role = 'admin';
            try {
              await setDoc(userRef, data, { merge: true });
            } catch (e) {
              console.error("Failed to upgrade admin role", e);
            }
          }
          setAppUser(data);
        } else {
          try {
            const newUser: AppUser = {
              email: user.email || '',
              name: user.displayName || 'No Name',
              role: localRole,
              createdAt: new Date().toISOString()
            };
            await setDoc(userRef, newUser);
            setAppUser(newUser);
          } catch (e) {
            console.error("Error creating user document", e);
            // Ignore for basic setup if permissions fail
          }
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addToCart = (item: OrderItem) => {
    setCart([...cart, item]);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider value={{ currentUser, appUser, loading, cart, addToCart, removeFromCart, clearCart }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};

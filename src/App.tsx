import { BrowserRouter, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./context/StoreContext";
import { ConfigProvider } from "./context/ConfigContext";
import { GatewayProvider } from "./context/GatewayContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { CouponProvider } from "./context/CouponContext";
import { ReceiptProvider } from "./context/ReceiptContext";
import { ChatProvider } from "./context/ChatContext";
import { ReviewProvider } from "./context/ReviewContext";
import AuthModal from "./components/AuthModal";
import ScrollToTop from "./components/ScrollToTop";
import ChatWidget from "./components/ChatWidget";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Newsticker from "./components/Newsticker";
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutCompletePage from "./pages/CheckoutCompletePage";
import GatewayDemoPage from "./pages/GatewayDemoPage";
import OrdersPage from "./pages/OrdersPage";
import ReceiptPage from "./pages/ReceiptPage";
import UserProfilePage from "./pages/UserProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import ContactPage from "./pages/ContactPage";
import CustomPage from "./pages/CustomPage";
import AdminPage from "./pages/AdminPage";
import PartnershipsPage from "./pages/PartnershipsPage";
import NewstickerPage from "./pages/NewstickerPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <StoreProvider>
      <ConfigProvider>
        <GatewayProvider>
        <AuthProvider>
          <CartProvider>
            <CouponProvider>
            <ReceiptProvider>
            <ChatProvider>
              <ReviewProvider>
                <BrowserRouter>
                  <ScrollToTop />
                  <div className="flex min-h-screen flex-col">
                    <Header />
                    <main className="flex-1">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/shop" element={<ShopPage />} />
                        <Route path="/product/:slug" element={<ProductDetailPage />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/checkout" element={<CheckoutPage />} />
                        <Route path="/checkout/complete" element={<CheckoutCompletePage />} />
                        <Route path="/gateway/:id" element={<GatewayDemoPage />} />
                        <Route path="/orders" element={<OrdersPage />} />
                        <Route path="/receipt/:orderId" element={<ReceiptPage />} />
                        <Route path="/profile" element={<UserProfilePage />} />
                        <Route path="/profile/edit" element={<EditProfilePage />} />
                        <Route path="/blog" element={<BlogPage />} />
                        <Route path="/blog/:slug" element={<BlogPostPage />} />
                        <Route path="/contact" element={<ContactPage />} />
                        <Route path="/page/:slug" element={<CustomPage />} />
                        <Route path="/admin" element={<AdminPage />} />
                        <Route path="/admin/partnerships" element={<PartnershipsPage />} />
                        <Route path="/admin/newsticker" element={<NewstickerPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </main>
                    <Footer />
                    <Newsticker />
                  </div>
                </BrowserRouter>
                <ChatWidget />
              </ReviewProvider>
            </ChatProvider>
            </ReceiptProvider>
            </CouponProvider>
            <AuthModal />
          </CartProvider>
        </AuthProvider>
        </GatewayProvider>
      </ConfigProvider>
    </StoreProvider>
  );
}
export type UserRole = 'restaurant' | 'hostel' | 'individual' | 'admin';
export type UserTier = 'free' | 'prime' | 'ngo';
export type FoodStatus = 'available' | 'reserved' | 'sold' | 'expired';
export type PaymentMethod = 'cash' | 'upi' | 'card';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  tier: UserTier;
  avatar_url: string | null;
  rating: number;
  rating_count: number;
  created_at: string;
}

export interface FoodPost {
  id: string;
  user_id: string;
  food_name: string;
  quantity: number;
  unit: string;
  price: number;
  original_price: number | null;
  expiry_time: string | null;
  lat: number | null;
  lng: number | null;
  location_text: string | null;
  photo_url: string | null;
  description: string | null;
  status: FoodStatus;
  created_at: string;
  updated_at: string;
}

export interface FoodPostWithSeller extends FoodPost {
  seller: Pick<Profile, 'id' | 'name' | 'rating' | 'rating_count' | 'role'>;
}

export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  food_id: string | null;
  food_name: string;
  amount: number;
  commission: number;
  payment_method: PaymentMethod;
  status: 'pending' | 'completed' | 'cancelled';
  delivered_at: string | null;
  created_at: string;
}

export interface Rating {
  id: string;
  giver_id: string;
  receiver_id: string;
  transaction_id: string | null;
  stars: number;
  comment: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface QualityAnalysis {
  qualityScore: number;
  freshness: string;
  hygiene: string;
  presentation: string;
  concerns: string[];
  recommendation: string;
  trustBadge: 'verified' | 'good' | 'caution' | 'warning';
}

export interface MatchmakingResult {
  recommendations: {
    foodId: string;
    foodName: string;
    score: number;
    reason: string;
    price: number;
    sellerName: string;
    distance?: number;
    timeLeft?: string;
  }[];
  aiInsights: string;
}

export interface WorkspaceMessage {
  id: string;
  foodPostId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
}

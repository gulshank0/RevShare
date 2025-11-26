'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  User, Mail, CreditCard, Upload, Save, Loader2, Wallet, IndianRupee, 
  TrendingUp, ArrowUpRight, ArrowDownRight, Building, Plus, Trash2, 
  CheckCircle, AlertCircle, Clock, X, Shield, ChevronDown, ChevronUp,
  RefreshCw, Ban
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import WalletDepositForm from '@/components/payment/WalletDepositForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BankAccount {
  id: string;
  accountHolderName: string;
  accountType: 'CHECKING' | 'SAVINGS';
  bankName: string;
  accountNumberLast4: string;
  isDefault: boolean;
  isVerified: boolean;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'SUSPENDED';
  createdAt: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  requestedAt: string;
  completedAt?: string;
  failureReason?: string;
  bankAccount: {
    bankName: string;
    accountNumberLast4: string;
    accountType: string;
  };
}

interface WalletData {
  id: string;
  balance: number;
  pendingBalance: number;
  lockedBalance: number;
  totalDeposited: number;
  totalInvested: number;
  totalWithdrawn: number;
  totalEarnings: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  description: string;
  createdAt: string;
  completedAt?: string;
}

export default function ProfileSettings() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet' | 'bank' | 'history'>('profile');
  
  // Wallet state
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  
  // Bank account state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBankData, setNewBankData] = useState({
    accountHolderName: '',
    bankName: '',
    routingNumber: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountType: 'CHECKING' as 'CHECKING' | 'SAVINGS',
    setAsDefault: true,
  });
  
  // Withdrawal state
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  
  // Profile state
  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    image: session?.user?.image || '',
  });
  const [imagePreview, setImagePreview] = useState(session?.user?.image || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Expanded sections
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

  // Fetch data when tabs change
  useEffect(() => {
    if (activeTab === 'wallet' || activeTab === 'history') {
      fetchWalletData();
    }
    if (activeTab === 'bank' || activeTab === 'wallet') {
      fetchBankAccounts();
    }
    if (activeTab === 'history') {
      fetchWithdrawals();
    }
  }, [activeTab]);

  const fetchWalletData = async () => {
    setIsLoadingWallet(true);
    try {
      const response = await fetch('/api/wallet');
      if (response.ok) {
        const data = await response.json();
        setWalletData(data.wallet);
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const fetchBankAccounts = async () => {
    setIsLoadingBanks(true);
    try {
      const response = await fetch('/api/wallet/bank-accounts');
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.bankAccounts || []);
        // Set default selected bank for withdrawal
        const defaultBank = data.bankAccounts?.find((b: BankAccount) => b.isDefault && b.isVerified);
        if (defaultBank) {
          setSelectedBankAccount(defaultBank.id);
        }
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setIsLoadingBanks(false);
    }
  };

  const fetchWithdrawals = async () => {
    setIsLoadingWithdrawals(true);
    try {
      const response = await fetch('/api/wallet/withdraw');
      if (response.ok) {
        const data = await response.json();
        setWithdrawals(data.withdrawals || []);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setIsLoadingWithdrawals(false);
    }
  };

  const handleDepositClick = async () => {
    const amount = parseFloat(depositAmount);
    
    if (!amount || amount < 50) {
      alert('Minimum deposit is ₹50');
      return;
    }
    
    if (amount > 10000000) {
      alert('Maximum deposit is ₹1,00,00,000');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (response.ok) {
        const data = await response.json();
        setClientSecret(data.clientSecret);
        setShowDepositForm(true);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create deposit');
      }
    } catch (error) {
      console.error('Error creating deposit:', error);
      alert('Failed to create deposit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepositSuccess = () => {
    setShowDepositForm(false);
    setClientSecret('');
    setDepositAmount('');
    fetchWalletData();
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newBankData.accountNumber !== newBankData.confirmAccountNumber) {
      alert('Account numbers do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/wallet/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountHolderName: newBankData.accountHolderName,
          bankName: newBankData.bankName,
          routingNumber: newBankData.routingNumber,
          accountNumber: newBankData.accountNumber,
          accountType: newBankData.accountType,
          setAsDefault: newBankData.setAsDefault,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setShowAddBank(false);
        setNewBankData({
          accountHolderName: '',
          bankName: '',
          routingNumber: '',
          accountNumber: '',
          confirmAccountNumber: '',
          accountType: 'CHECKING',
          setAsDefault: true,
        });
        fetchBankAccounts();
      } else {
        alert(data.error || 'Failed to add bank account');
      }
    } catch (error) {
      console.error('Error adding bank account:', error);
      alert('Failed to add bank account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBankAccount = async (id: string) => {
    if (!confirm('Are you sure you want to remove this bank account?')) return;

    try {
      const response = await fetch(`/api/wallet/bank-accounts?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchBankAccounts();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete bank account');
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
    }
  };

  const handleSetDefaultBank = async (id: string) => {
    try {
      const response = await fetch('/api/wallet/bank-accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountId: id, setAsDefault: true }),
      });

      if (response.ok) {
        fetchBankAccounts();
      }
    } catch (error) {
      console.error('Error setting default bank:', error);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount < 50) {
      setWithdrawError('Minimum withdrawal is ₹50');
      return;
    }

    if (!selectedBankAccount) {
      setWithdrawError('Please select a bank account');
      return;
    }

    const availableBalance = (walletData?.balance || 0) - (walletData?.lockedBalance || 0);
    if (amount > availableBalance) {
      setWithdrawError(`Insufficient balance. Available: ${formatCurrency(availableBalance)}`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          bankAccountId: selectedBankAccount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setWithdrawAmount('');
        fetchWalletData();
        fetchWithdrawals();
        alert('Withdrawal request submitted successfully!');
      } else {
        setWithdrawError(data.error || 'Failed to process withdrawal');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      setWithdrawError('Failed to process withdrawal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelWithdrawal = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this withdrawal?')) return;

    try {
      const response = await fetch(`/api/wallet/withdraw?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchWalletData();
        fetchWithdrawals();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel withdrawal');
      }
    } catch (error) {
      console.error('Error cancelling withdrawal:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Upload image if a new one was selected
      let imageUrl = formData.image;
      if (imageFile) {
        const formDataImage = new FormData();
        formDataImage.append('file', imageFile);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formDataImage,
        });
        
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          imageUrl = url;
        }
      }

      // Update user profile
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          image: imageUrl,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Update the session
      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
          email: formData.email,
          image: imageUrl,
        },
      });

      alert('Profile updated successfully!');
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <ArrowDownRight className="w-5 h-5 text-green-500" />;
      case 'WITHDRAWAL':
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case 'INVESTMENT':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'EARNING':
      case 'PAYOUT':
        return <IndianRupee className="w-5 h-5 text-green-500" />;
      case 'REFUND':
        return <RefreshCw className="w-5 h-5 text-yellow-500" />;
      default:
        return <IndianRupee className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/20',
      PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      PROCESSING: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      FAILED: 'bg-red-500/10 text-red-500 border-red-500/20',
      CANCELLED: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      VERIFIED: 'bg-green-500/10 text-green-500 border-green-500/20',
      CONFIRMED: 'bg-green-500/10 text-green-500 border-green-500/20',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.PENDING}`}>
        {status}
      </span>
    );
  };

  const verifiedBankAccounts = bankAccounts.filter(b => b.isVerified && b.status === 'VERIFIED');
  const availableBalance = (walletData?.balance || 0) - (walletData?.lockedBalance || 0);
  const withdrawalFee = Number.parseFloat(withdrawAmount || '0') * 0.015;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-zinc-800/50 rounded-lg p-1">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'wallet', label: 'Wallet', icon: Wallet },
          { id: 'bank', label: 'Bank Accounts', icon: Building },
          { id: 'history', label: 'History', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-zinc-700/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card className="bg-zinc-900 border-zinc-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-300">
                Profile Picture
              </label>
              <div className="flex items-center space-x-6">
                <div className="relative">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center text-3xl font-bold text-white">
                      {formData.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-flex items-center px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Account Type
                </label>
                <div className="inline-flex items-center px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <span className="text-sm font-medium text-white">
                    {session?.user?.role || 'INVESTOR'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  KYC Status
                </label>
                <div className="inline-flex items-center px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                  {getStatusBadge(session?.user?.kycStatus || 'PENDING')}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Wallet Tab */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {isLoadingWallet ? (
            <Card className="bg-zinc-900 border-zinc-800 p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              </div>
            </Card>
          ) : (
            <>
              {/* Wallet Balance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-red-600 to-red-700 border-red-500 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white/80 text-sm font-medium">Available Balance</h3>
                    <Wallet className="w-5 h-5 text-white/80" />
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {formatCurrency(availableBalance)}
                  </p>
                  {(walletData?.lockedBalance || 0) > 0 && (
                    <p className="text-sm text-white/60 mt-1">
                      +{formatCurrency(walletData?.lockedBalance || 0)} locked
                    </p>
                  )}
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-400 text-sm font-medium">Total Deposited</h3>
                    <ArrowDownRight className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(walletData?.totalDeposited || 0)}
                  </p>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-400 text-sm font-medium">Total Invested</h3>
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(walletData?.totalInvested || 0)}
                  </p>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-400 text-sm font-medium">Total Earnings</h3>
                    <IndianRupee className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(walletData?.totalEarnings || 0)}
                  </p>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Deposit Section */}
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <ArrowDownRight className="w-5 h-5 mr-2 text-green-500" />
                    Add Funds
                  </h3>
                  
                  {!showDepositForm ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Deposit Amount (INR)
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            type="number"
                            min="50"
                            max="10000000"
                            step="1"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                            placeholder="Enter amount (min ₹50)"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {[1000, 5000, 10000, 50000].map((amount) => (
                          <Button
                            key={amount}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDepositAmount(amount.toString())}
                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                          >
                            ₹{amount.toLocaleString('en-IN')}
                          </Button>
                        ))}
                      </div>

                      <Button
                        onClick={handleDepositClick}
                        disabled={isLoading || !depositAmount}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Continue to Payment
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <WalletDepositForm
                        amount={parseFloat(depositAmount)}
                        clientSecret={clientSecret}
                        onSuccess={handleDepositSuccess}
                        onCancel={() => {
                          setShowDepositForm(false);
                          setClientSecret('');
                        }}
                      />
                    </Elements>
                  )}
                </Card>

                {/* Withdraw Section */}
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <ArrowUpRight className="w-5 h-5 mr-2 text-red-500" />
                    Withdraw Funds
                  </h3>

                  {session?.user?.kycStatus !== 'VERIFIED' ? (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <p className="text-gray-400 mb-4">
                        Complete KYC verification to enable withdrawals
                      </p>
                      <Button
                        onClick={() => router.push('/profile?tab=kyc')}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        Complete Verification
                      </Button>
                    </div>
                  ) : verifiedBankAccounts.length === 0 ? (
                    <div className="text-center py-8">
                      <Building className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 mb-4">
                        Add a bank account to enable withdrawals
                      </p>
                      <Button
                        onClick={() => setActiveTab('bank')}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Bank Account
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleWithdraw} className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Withdraw Amount (INR)
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            type="number"
                            min="50"
                            max={availableBalance}
                            step="1"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                            placeholder="Enter amount (min ₹50)"
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Available: {formatCurrency(availableBalance)} • Fee: 1.5%
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Bank Account
                        </label>
                        <select
                          value={selectedBankAccount}
                          onChange={(e) => setSelectedBankAccount(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                        >
                          <option value="">Select bank account</option>
                          {verifiedBankAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.bankName} ****{account.accountNumberLast4}
                              {account.isDefault && ' (Default)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {parseFloat(withdrawAmount || '0') >= 50 && (
                        <div className="p-3 bg-zinc-800 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Amount</span>
                            <span className="text-white">{formatCurrency(parseFloat(withdrawAmount || '0'))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Fee (1.5%)</span>
                            <span className="text-red-400">-{formatCurrency(withdrawalFee)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold border-t border-zinc-700 pt-2">
                            <span className="text-white">You'll receive</span>
                            <span className="text-green-400">
                              {formatCurrency(parseFloat(withdrawAmount || '0') - withdrawalFee)}
                            </span>
                          </div>
                        </div>
                      )}

                      {withdrawError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-sm text-red-500 flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {withdrawError}
                          </p>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={isLoading || !withdrawAmount || !selectedBankAccount}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Request Withdrawal'
                        )}
                      </Button>
                    </form>
                  )}
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* Bank Accounts Tab */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Your Bank Accounts</h3>
            <Button
              onClick={() => setShowAddBank(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={bankAccounts.length >= 5}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Bank Account
            </Button>
          </div>

          {session?.user?.kycStatus !== 'VERIFIED' && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-500 font-medium">KYC Verification Required</p>
                <p className="text-sm text-gray-400 mt-1">
                  You need to complete identity verification before adding bank accounts.
                </p>
              </div>
            </div>
          )}

          {/* Add Bank Account Form */}
          {showAddBank && (
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-semibold text-white">Add New Bank Account</h4>
                <button onClick={() => setShowAddBank(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddBankAccount} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Account Holder Name
                    </label>
                    <Input
                      value={newBankData.accountHolderName}
                      onChange={(e) => setNewBankData({ ...newBankData, accountHolderName: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Bank Name
                    </label>
                    <Input
                      value={newBankData.bankName}
                      onChange={(e) => setNewBankData({ ...newBankData, bankName: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="State Bank of India"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      IFSC Code
                    </label>
                    <Input
                      value={newBankData.routingNumber}
                      onChange={(e) => setNewBankData({ ...newBankData, routingNumber: e.target.value.toUpperCase().slice(0, 11) })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="SBIN0001234"
                      maxLength={11}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Account Type
                    </label>
                    <select
                      value={newBankData.accountType}
                      onChange={(e) => setNewBankData({ ...newBankData, accountType: e.target.value as 'CHECKING' | 'SAVINGS' })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    >
                      <option value="CHECKING">Checking</option>
                      <option value="SAVINGS">Savings</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Account Number
                    </label>
                    <Input
                      type="password"
                      value={newBankData.accountNumber}
                      onChange={(e) => setNewBankData({ ...newBankData, accountNumber: e.target.value.replace(/\D/g, '') })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="9-18 digits"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Confirm Account Number
                    </label>
                    <Input
                      type="password"
                      value={newBankData.confirmAccountNumber}
                      onChange={(e) => setNewBankData({ ...newBankData, confirmAccountNumber: e.target.value.replace(/\D/g, '') })}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      placeholder="Re-enter account number"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="setDefault"
                    checked={newBankData.setAsDefault}
                    onChange={(e) => setNewBankData({ ...newBankData, setAsDefault: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-600"
                  />
                  <label htmlFor="setDefault" className="text-sm text-gray-300">
                    Set as default bank account
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Bank Account'
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowAddBank(false)}
                    variant="outline"
                    className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Bank Accounts List */}
          {isLoadingBanks ? (
            <Card className="bg-zinc-900 border-zinc-800 p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              </div>
            </Card>
          ) : bankAccounts.length === 0 ? (
            <Card className="bg-zinc-900 border-zinc-800 p-8">
              <div className="text-center">
                <Building className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No bank accounts linked</p>
                <p className="text-sm text-gray-500">
                  Add a bank account to withdraw your earnings
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <Card key={account.id} className="bg-zinc-900 border-zinc-800 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
                        <Building className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-white">{account.bankName}</p>
                          {account.isDefault && (
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20">
                              Default
                            </span>
                          )}
                          {getStatusBadge(account.status)}
                        </div>
                        <p className="text-sm text-gray-400">
                          {account.accountType} ****{account.accountNumberLast4}
                        </p>
                        <p className="text-xs text-gray-500">{account.accountHolderName}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!account.isDefault && account.isVerified && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetDefaultBank(account.id)}
                          className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteBankAccount(account.id)}
                        className="bg-zinc-800 border-zinc-700 hover:bg-red-600/20 text-red-400 hover:text-red-300 hover:border-red-600/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Pending Withdrawals */}
          {withdrawals.filter(w => ['PENDING', 'PROCESSING'].includes(w.status)).length > 0 && (
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-yellow-500" />
                Pending Withdrawals
              </h3>
              <div className="space-y-3">
                {withdrawals
                  .filter(w => ['PENDING', 'PROCESSING'].includes(w.status))
                  .map((withdrawal) => (
                    <div
                      key={withdrawal.id}
                      className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                          <ArrowUpRight className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {formatCurrency(withdrawal.netAmount)} to {withdrawal.bankAccount.bankName}
                          </p>
                          <p className="text-sm text-gray-400">
                            ****{withdrawal.bankAccount.accountNumberLast4} • {formatDate(withdrawal.requestedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(withdrawal.status)}
                        {withdrawal.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelWithdrawal(withdrawal.id)}
                            className="bg-zinc-800 border-zinc-700 hover:bg-red-600/20 text-red-400"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Transaction History */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Transaction History</h3>
            
            {isLoadingWallet ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No transactions yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Your transaction history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:bg-zinc-800 transition-colors"
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedTransaction(
                        expandedTransaction === transaction.id ? null : transaction.id
                      )}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {transaction.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-400">
                            {transaction.description || formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className={`font-semibold ${
                            ['DEPOSIT', 'EARNING', 'PAYOUT', 'REFUND'].includes(transaction.type) 
                              ? 'text-green-500' 
                              : 'text-red-500'
                          }`}>
                            {['DEPOSIT', 'EARNING', 'PAYOUT', 'REFUND'].includes(transaction.type) ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </p>
                          <div className="mt-1">
                            {getStatusBadge(transaction.status)}
                          </div>
                        </div>
                        {expandedTransaction === transaction.id ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {expandedTransaction === transaction.id && (
                      <div className="mt-4 pt-4 border-t border-zinc-700 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Transaction ID</p>
                          <p className="text-gray-300 font-mono text-xs">{transaction.id}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p className="text-gray-300">{formatDate(transaction.createdAt)}</p>
                        </div>
                        {transaction.fee > 0 && (
                          <div>
                            <p className="text-gray-500">Fee</p>
                            <p className="text-red-400">{formatCurrency(transaction.fee)}</p>
                          </div>
                        )}
                        {transaction.netAmount && transaction.netAmount !== transaction.amount && (
                          <div>
                            <p className="text-gray-500">Net Amount</p>
                            <p className="text-gray-300">{formatCurrency(transaction.netAmount)}</p>
                          </div>
                        )}
                        {transaction.completedAt && (
                          <div>
                            <p className="text-gray-500">Completed</p>
                            <p className="text-gray-300">{formatDate(transaction.completedAt)}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

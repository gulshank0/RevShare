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
  RefreshCw, Ban, FileText, Camera, Calendar, MapPin, Phone, BadgeCheck,
  AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import WalletDepositForm from '@/components/payment/WalletDepositForm';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BankAccount {
  id: string;
  accountHolderName: string;
  accountType: 'SAVING' | 'CURRENT';
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
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'kyc' | 'wallet' | 'bank' | 'history'>('profile');
  
  // Check for tab query parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'kyc', 'wallet', 'bank', 'history'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);
  
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
  const [bankFormError, setBankFormError] = useState('');
  const [bankFormSuccess, setBankFormSuccess] = useState('');
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [showConfirmAccountNumber, setShowConfirmAccountNumber] = useState(false);
  const [newBankData, setNewBankData] = useState({
    accountHolderName: '',
    bankName: '',
    routingNumber: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountType: 'SAVING' as 'SAVING' | 'CURRENT',
    setAsDefault: true,
  });

  // Popular Indian Banks
  const popularBanks = [
    'State Bank of India',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Punjab National Bank',
    'Bank of Baroda',
    'Canara Bank',
    'Union Bank of India',
    'IndusInd Bank',
    'Yes Bank',
    'IDBI Bank',
    'Federal Bank',
    'Bank of India',
    'Central Bank of India',
    'Indian Bank',
    'UCO Bank',
    'Indian Overseas Bank',
    'Bandhan Bank',
    'IDFC First Bank',
    'Other',
  ];
  
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
  
  // KYC state
  const [kycStatus, setKycStatus] = useState<'PENDING' | 'VERIFIED' | 'REJECTED' | 'NOT_SUBMITTED'>('NOT_SUBMITTED');
  const [kycData, setKycData] = useState<any>(null);
  const [isLoadingKyc, setIsLoadingKyc] = useState(false);
  const [kycError, setKycError] = useState('');
  const [kycSuccess, setKycSuccess] = useState('');
  const [showPanNumber, setShowPanNumber] = useState(false);
  const [showAadhaarNumber, setShowAadhaarNumber] = useState(false);
  const [kycStep, setKycStep] = useState(1); // 1: Personal, 2: Address, 3: Documents, 4: Upload & Verify
  const [kycFormData, setKycFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male' as 'male' | 'female' | 'other',
    phoneNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    panNumber: '',
    aadhaarNumber: '',
    documentType: 'aadhaar' as 'aadhaar' | 'passport' | 'voter_id' | 'driving_license',
    documentNumber: '',
    documentFrontImage: null as File | null,
    documentBackImage: null as File | null,
    selfieImage: null as File | null,
  });
  const [documentFrontPreview, setDocumentFrontPreview] = useState('');
  const [documentBackPreview, setDocumentBackPreview] = useState('');
  const [selfiePreview, setSelfiePreview] = useState('');
  
  // Expanded sections
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);

  // Check for payment success from URL query params
  useEffect(() => {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const paymentStatus = urlParams.get('payment');
    
    if (paymentStatus === 'success') {
      // Clear the URL parameter
      const newUrl = globalThis.location.pathname;
      globalThis.history.replaceState({}, '', newUrl);
      
      // Show success message and switch to wallet tab
      setActiveTab('wallet');
      setPaymentSuccessMessage('Payment successful! Your wallet balance has been updated.');
      
      // Fetch latest wallet data
      fetchWalletData();
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setPaymentSuccessMessage(null);
      }, 5000);
    }
  }, []);

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
    if (activeTab === 'kyc') {
      fetchKycStatus();
    }
  }, [activeTab]);

  // Fetch KYC status on initial load
  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    setIsLoadingKyc(true);
    try {
      const response = await fetch('/api/kyc');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setKycStatus(data.status || 'NOT_SUBMITTED');
          setKycData(data.data);
          
          // Pre-fill form if data exists
          if (data.data) {
            setKycFormData(prev => ({
              ...prev,
              firstName: data.data.firstName || '',
              lastName: data.data.lastName || '',
              dateOfBirth: data.data.dateOfBirth || '',
              gender: data.data.gender || 'male',
              phoneNumber: data.data.phoneNumber || '',
              address: data.data.address || prev.address,
              panNumber: data.data.panNumber || '',
              aadhaarNumber: data.data.aadhaarNumber || '',
              documentType: data.data.documentType || 'aadhaar',
              documentNumber: data.data.documentNumber || '',
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching KYC status:', error);
    } finally {
      setIsLoadingKyc(false);
    }
  };

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
    const amount = Number.parseFloat(depositAmount);
    
    if (!amount || amount < 100) {
      alert('Minimum deposit is ₹100');
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

  const handleDepositSuccess = (newBalance?: number) => {
    setShowDepositForm(false);
    setClientSecret('');
    setDepositAmount('');
    
    // If new balance was provided, update it immediately
    if (newBalance !== undefined && walletData) {
      setWalletData({
        ...walletData,
        balance: newBalance,
        totalDeposited: walletData.totalDeposited + Number.parseFloat(depositAmount || '0'),
      });
    }
    
    // Still fetch to ensure we have the latest data
    fetchWalletData();
  };

  // Validate IFSC Code (Indian Financial System Code)
  const validateIFSC = (ifsc: string) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  };

  // Validate Bank Account Number (Indian - 9-18 digits)
  const validateBankAccountNumber = (accountNumber: string) => {
    return /^\d{9,18}$/.test(accountNumber);
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankFormError('');
    setBankFormSuccess('');
    
    // Validation
    if (!newBankData.accountHolderName.trim()) {
      setBankFormError('Account holder name is required');
      return;
    }

    if (!newBankData.bankName) {
      setBankFormError('Please select a bank');
      return;
    }

    if (!validateIFSC(newBankData.routingNumber)) {
      setBankFormError('Invalid IFSC code. Format: First 4 letters (bank code), 5th character is 0, last 6 alphanumeric (branch code). Example: SBIN0001234');
      return;
    }

    if (!validateBankAccountNumber(newBankData.accountNumber)) {
      setBankFormError('Invalid account number. Must be 9-18 digits.');
      return;
    }
    
    if (newBankData.accountNumber !== newBankData.confirmAccountNumber) {
      setBankFormError('Account numbers do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/wallet/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountHolderName: newBankData.accountHolderName.trim(),
          bankName: newBankData.bankName,
          routingNumber: newBankData.routingNumber.toUpperCase(),
          accountNumber: newBankData.accountNumber,
          accountType: newBankData.accountType,
          setAsDefault: newBankData.setAsDefault,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setBankFormSuccess('Bank account added successfully!');
        setNewBankData({
          accountHolderName: '',
          bankName: '',
          routingNumber: '',
          accountNumber: '',
          confirmAccountNumber: '',
          accountType: 'SAVING',
          setAsDefault: true,
        });
        fetchBankAccounts();
        setTimeout(() => {
          setShowAddBank(false);
          setBankFormSuccess('');
        }, 1500);
      } else {
        setBankFormError(data.error || 'Failed to add bank account');
      }
    } catch (error) {
      console.error('Error adding bank account:', error);
      setBankFormError('Failed to add bank account. Please try again.');
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
    
    const amount = Number.parseFloat(withdrawAmount);
    
    if (!amount || amount < 60) {
      setWithdrawError('Minimum withdrawal is ₹60');
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
        setSelectedBankAccount('');
        fetchWalletData();
        fetchWithdrawals();
        // Switch to history tab to show the pending withdrawal
        setActiveTab('history');
      } else {
        setWithdrawError(data.error || 'Failed to process withdrawal');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      setWithdrawError('Failed to process withdrawal. Please try again.');
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

  // KYC document image handlers
  const handleDocumentFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setKycError('Document image must be less than 5MB');
        return;
      }
      setKycFormData(prev => ({ ...prev, documentFrontImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentFrontPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setKycError('Document image must be less than 5MB');
        return;
      }
      setKycFormData(prev => ({ ...prev, documentBackImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentBackPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelfieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setKycError('Selfie image must be less than 5MB');
        return;
      }
      setKycFormData(prev => ({ ...prev, selfieImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelfiePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Validate Indian PAN number
  const validatePan = (pan: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  // Validate Indian Aadhaar number
  const validateAadhaar = (aadhaar: string) => {
    const aadhaarRegex = /^[2-9]{1}[0-9]{11}$/;
    return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
  };

  // Validate Indian phone number
  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // Validate Pincode
  const validatePincode = (pincode: string) => {
    const pincodeRegex = /^[1-9]\d{5}$/;
    return pincodeRegex.test(pincode);
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycError('');
    setKycSuccess('');
    setIsLoading(true);

    // Validation
    if (!kycFormData.firstName.trim() || !kycFormData.lastName.trim()) {
      setKycError('First name and last name are required');
      setIsLoading(false);
      return;
    }

    if (!kycFormData.dateOfBirth) {
      setKycError('Date of birth is required');
      setIsLoading(false);
      return;
    }

    // Age validation (must be 18+)
    const dob = new Date(kycFormData.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    if (age < 18) {
      setKycError('You must be at least 18 years old');
      setIsLoading(false);
      return;
    }

    if (!validatePhoneNumber(kycFormData.phoneNumber)) {
      setKycError('Please enter a valid 10-digit Indian mobile number');
      setIsLoading(false);
      return;
    }

    if (!kycFormData.address.street || !kycFormData.address.city || 
        !kycFormData.address.state || !kycFormData.address.pincode) {
      setKycError('Complete address is required');
      setIsLoading(false);
      return;
    }

    if (!validatePincode(kycFormData.address.pincode)) {
      setKycError('Please enter a valid 6-digit pincode');
      setIsLoading(false);
      return;
    }

    if (!validatePan(kycFormData.panNumber)) {
      setKycError('Please enter a valid PAN number (e.g., ABCDE1234F)');
      setIsLoading(false);
      return;
    }

    if (kycFormData.documentType === 'aadhaar' && !validateAadhaar(kycFormData.aadhaarNumber)) {
      setKycError('Please enter a valid 12-digit Aadhaar number');
      setIsLoading(false);
      return;
    }

    if (!kycFormData.documentFrontImage) {
      setKycError('Please upload the front side of your identity document');
      setIsLoading(false);
      return;
    }

    if (kycFormData.documentType !== 'passport' && !kycFormData.documentBackImage) {
      setKycError('Please upload the back side of your identity document');
      setIsLoading(false);
      return;
    }

    if (!kycFormData.selfieImage) {
      setKycError('Please upload a selfie for verification');
      setIsLoading(false);
      return;
    }

    try {
      // Upload documents first
      const uploadDocument = async (file: File, type: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${type}`);
        }
        
        const data = await response.json();
        return data.url;
      };

      const documentFrontUrl = await uploadDocument(kycFormData.documentFrontImage, 'kyc_document_front');
      const documentBackUrl = kycFormData.documentBackImage 
        ? await uploadDocument(kycFormData.documentBackImage, 'kyc_document_back')
        : null;
      const selfieUrl = await uploadDocument(kycFormData.selfieImage, 'kyc_selfie');

      // Submit KYC data
      const response = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: kycFormData.firstName.trim(),
          lastName: kycFormData.lastName.trim(),
          dateOfBirth: kycFormData.dateOfBirth,
          gender: kycFormData.gender,
          phoneNumber: kycFormData.phoneNumber.replace(/\s/g, ''),
          address: {
            street: kycFormData.address.street.trim(),
            city: kycFormData.address.city.trim(),
            state: kycFormData.address.state.trim(),
            pincode: kycFormData.address.pincode.trim(),
            country: 'India',
          },
          panNumber: kycFormData.panNumber.toUpperCase(),
          aadhaarNumber: kycFormData.aadhaarNumber.replace(/\s/g, ''),
          documentType: kycFormData.documentType,
          documentNumber: kycFormData.documentNumber || kycFormData.aadhaarNumber,
          documents: {
            front: documentFrontUrl,
            back: documentBackUrl,
            selfie: selfieUrl,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setKycSuccess('KYC verification submitted successfully! We will review your documents within 24-48 hours.');
        setKycStatus('PENDING');
        fetchKycStatus();
      } else {
        setKycError(data.error || 'Failed to submit KYC verification');
      }
    } catch (error: any) {
      console.error('KYC submission error:', error);
      setKycError(error.message || 'Failed to submit KYC verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getKycStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      VERIFIED: 'bg-green-500/10 text-green-500 border-green-500/20',
      PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20',
      NOT_SUBMITTED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    };
    
    const labels: Record<string, string> = {
      VERIFIED: 'Verified',
      PENDING: 'Under Review',
      REJECTED: 'Rejected',
      NOT_SUBMITTED: 'Not Submitted',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${colors[status] || colors.NOT_SUBMITTED}`}>
        {labels[status] || 'Unknown'}
      </span>
    );
  };

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
  ];

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
      <div className="flex space-x-1 bg-zinc-800/50 rounded-lg p-1 overflow-x-auto">
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'kyc', label: 'KYC', icon: Shield, badge: kycStatus !== 'VERIFIED' },
          { id: 'wallet', label: 'Wallet', icon: Wallet },
          { id: 'bank', label: 'Bank Accounts', icon: Building },
          { id: 'history', label: 'History', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all relative ${
              activeTab === tab.id
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-zinc-700/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge && kycStatus !== 'VERIFIED' && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
            )}
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

      {/* KYC Tab */}
      {activeTab === 'kyc' && (
        <div className="space-y-6">
          {/* KYC Status Card */}
          <Card className="bg-zinc-900 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  kycStatus === 'VERIFIED' 
                    ? 'bg-green-500/10' 
                    : kycStatus === 'PENDING' 
                    ? 'bg-yellow-500/10' 
                    : kycStatus === 'REJECTED'
                    ? 'bg-red-500/10'
                    : 'bg-zinc-800'
                }`}>
                  {kycStatus === 'VERIFIED' ? (
                    <BadgeCheck className="w-7 h-7 text-green-500" />
                  ) : kycStatus === 'PENDING' ? (
                    <Clock className="w-7 h-7 text-yellow-500" />
                  ) : kycStatus === 'REJECTED' ? (
                    <AlertTriangle className="w-7 h-7 text-red-500" />
                  ) : (
                    <Shield className="w-7 h-7 text-gray-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">KYC Verification</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {kycStatus === 'VERIFIED' 
                      ? 'Your identity has been verified' 
                      : kycStatus === 'PENDING'
                      ? 'Your verification is under review'
                      : kycStatus === 'REJECTED'
                      ? 'Your verification was rejected'
                      : 'Complete KYC to enable withdrawals'}
                  </p>
                </div>
              </div>
              {getKycStatusBadge(kycStatus)}
            </div>

            {kycStatus === 'VERIFIED' && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-green-400 font-medium">Verification Complete</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Your KYC verification is complete. You can now withdraw funds to your bank account.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {kycStatus === 'PENDING' && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">Verification In Progress</p>
                    <p className="text-sm text-gray-400 mt-1">
                      We are reviewing your documents. This usually takes 24-48 hours. You will receive an email once the verification is complete.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {kycStatus === 'REJECTED' && kycData?.rejectionReason && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium">Verification Rejected</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Reason: {kycData.rejectionReason}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Please resubmit your documents with correct information.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* KYC Form - Show only if not verified or rejected */}
          {(kycStatus === 'NOT_SUBMITTED' || kycStatus === 'REJECTED') && (
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <form onSubmit={handleKycSubmit} className="space-y-6">
                {/* Error/Success Messages */}
                {kycError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-red-400 text-sm">{kycError}</p>
                  </div>
                )}
                {kycSuccess && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <p className="text-green-400 text-sm">{kycSuccess}</p>
                  </div>
                )}

                {/* Personal Information */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-red-600" />
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={kycFormData.firstName}
                        onChange={(e) => setKycFormData({ ...kycFormData, firstName: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={kycFormData.lastName}
                        onChange={(e) => setKycFormData({ ...kycFormData, lastName: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="date"
                          value={kycFormData.dateOfBirth}
                          onChange={(e) => setKycFormData({ ...kycFormData, dateOfBirth: e.target.value })}
                          className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                          max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500">Must be 18 years or older</p>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={kycFormData.gender}
                        onChange={(e) => setKycFormData({ ...kycFormData, gender: e.target.value as any })}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <div className="flex">
                          <span className="inline-flex items-center px-3 bg-zinc-700 border border-r-0 border-zinc-600 rounded-l-lg text-gray-300 text-sm">
                            +91
                          </span>
                          <Input
                            type="tel"
                            value={kycFormData.phoneNumber}
                            onChange={(e) => setKycFormData({ ...kycFormData, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            className="bg-zinc-800 border-zinc-700 text-white rounded-l-none"
                            placeholder="10-digit mobile number"
                            maxLength={10}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-600" />
                    Address
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Street Address <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={kycFormData.address.street}
                        onChange={(e) => setKycFormData({ 
                          ...kycFormData, 
                          address: { ...kycFormData.address, street: e.target.value } 
                        })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="House/Flat No., Building, Street"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        City <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={kycFormData.address.city}
                        onChange={(e) => setKycFormData({ 
                          ...kycFormData, 
                          address: { ...kycFormData.address, city: e.target.value } 
                        })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="City"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        State <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={kycFormData.address.state}
                        onChange={(e) => setKycFormData({ 
                          ...kycFormData, 
                          address: { ...kycFormData.address, state: e.target.value } 
                        })}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                        required
                      >
                        <option value="">Select State</option>
                        {indianStates.map((state) => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Pincode <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={kycFormData.address.pincode}
                        onChange={(e) => setKycFormData({ 
                          ...kycFormData, 
                          address: { ...kycFormData.address, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) } 
                        })}
                        className="bg-zinc-800 border-zinc-700 text-white"
                        placeholder="6-digit pincode"
                        maxLength={6}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Country
                      </label>
                      <Input
                        value="India"
                        disabled
                        className="bg-zinc-700 border-zinc-600 text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Identity Documents */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-600" />
                    Identity Documents
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* PAN Number */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        PAN Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          type={showPanNumber ? 'text' : 'password'}
                          value={kycFormData.panNumber}
                          onChange={(e) => setKycFormData({ ...kycFormData, panNumber: e.target.value.toUpperCase().slice(0, 10) })}
                          className="bg-zinc-800 border-zinc-700 text-white pr-10"
                          placeholder="ABCDE1234F"
                          maxLength={10}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPanNumber(!showPanNumber)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showPanNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">Permanent Account Number (mandatory for tax purposes)</p>
                    </div>

                    {/* Document Type */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        ID Proof Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={kycFormData.documentType}
                        onChange={(e) => setKycFormData({ ...kycFormData, documentType: e.target.value as any })}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                      >
                        <option value="aadhaar">Aadhaar Card</option>
                        <option value="passport">Passport</option>
                        <option value="voter_id">Voter ID Card</option>
                        <option value="driving_license">Driving License</option>
                      </select>
                    </div>

                    {/* Aadhaar Number - Show only if Aadhaar is selected */}
                    {kycFormData.documentType === 'aadhaar' && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Aadhaar Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            type={showAadhaarNumber ? 'text' : 'password'}
                            value={kycFormData.aadhaarNumber}
                            onChange={(e) => setKycFormData({ ...kycFormData, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                            className="bg-zinc-800 border-zinc-700 text-white pr-10"
                            placeholder="12-digit Aadhaar number"
                            maxLength={12}
                            required={kycFormData.documentType === 'aadhaar'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowAadhaarNumber(!showAadhaarNumber)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                          >
                            {showAadhaarNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Document Number for non-Aadhaar */}
                    {kycFormData.documentType !== 'aadhaar' && (
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300">
                          {kycFormData.documentType === 'passport' ? 'Passport Number' :
                           kycFormData.documentType === 'voter_id' ? 'Voter ID Number' :
                           'Driving License Number'} <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={kycFormData.documentNumber}
                          onChange={(e) => setKycFormData({ ...kycFormData, documentNumber: e.target.value.toUpperCase() })}
                          className="bg-zinc-800 border-zinc-700 text-white"
                          placeholder="Enter document number"
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Upload */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-red-600" />
                    Document Upload
                  </h4>
                  <p className="text-sm text-gray-400 mb-4">
                    Please upload clear images of your documents. Accepted formats: JPG, PNG (max 5MB each)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Document Front */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Document Front <span className="text-red-500">*</span>
                      </label>
                      <div className={`relative border-2 border-dashed rounded-lg p-4 text-center ${
                        documentFrontPreview ? 'border-green-500/50' : 'border-zinc-700 hover:border-red-600/50'
                      }`}>
                        {documentFrontPreview ? (
                          <div className="relative">
                            <img 
                              src={documentFrontPreview} 
                              alt="Document Front" 
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setDocumentFrontPreview('');
                                setKycFormData(prev => ({ ...prev, documentFrontImage: null }));
                              }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                            <span className="text-sm text-gray-400">Click to upload</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/jpg"
                              onChange={handleDocumentFrontChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Document Back - Not needed for passport */}
                    {kycFormData.documentType !== 'passport' && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Document Back <span className="text-red-500">*</span>
                        </label>
                        <div className={`relative border-2 border-dashed rounded-lg p-4 text-center ${
                          documentBackPreview ? 'border-green-500/50' : 'border-zinc-700 hover:border-red-600/50'
                        }`}>
                          {documentBackPreview ? (
                            <div className="relative">
                              <img 
                                src={documentBackPreview} 
                                alt="Document Back" 
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setDocumentBackPreview('');
                                  setKycFormData(prev => ({ ...prev, documentBackImage: null }));
                                }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="cursor-pointer block">
                              <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                              <span className="text-sm text-gray-400">Click to upload</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={handleDocumentBackChange}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Selfie */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Selfie Photo <span className="text-red-500">*</span>
                      </label>
                      <div className={`relative border-2 border-dashed rounded-lg p-4 text-center ${
                        selfiePreview ? 'border-green-500/50' : 'border-zinc-700 hover:border-red-600/50'
                      }`}>
                        {selfiePreview ? (
                          <div className="relative">
                            <img 
                              src={selfiePreview} 
                              alt="Selfie" 
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSelfiePreview('');
                                setKycFormData(prev => ({ ...prev, selfieImage: null }));
                              }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <Camera className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                            <span className="text-sm text-gray-400">Take or upload selfie</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/jpg"
                              onChange={handleSelfieChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Clear front-facing photo of yourself</p>
                    </div>
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="kyc-terms"
                      required
                      className="w-4 h-4 mt-1 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-600"
                    />
                    <label htmlFor="kyc-terms" className="text-sm text-gray-400">
                      I hereby declare that the information provided above is true and correct to the best of my knowledge. 
                      I authorize the verification of my identity documents as per the applicable KYC regulations. 
                      I understand that providing false information may result in legal action.
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white px-8"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Submit KYC Verification
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Submitted KYC Details - Show when pending or verified */}
          {(kycStatus === 'PENDING' || kycStatus === 'VERIFIED') && kycData && (
            <Card className="bg-zinc-900 border-zinc-800 p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Submitted Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="text-white">{kycData.firstName} {kycData.lastName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="text-white">{kycData.dateOfBirth ? new Date(kycData.dateOfBirth).toLocaleDateString('en-IN') : '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="text-white">+91 {kycData.phoneNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">PAN Number</p>
                  <p className="text-white">{kycData.panNumber ? `****${kycData.panNumber.slice(-4)}` : '-'}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-white">
                    {kycData.address?.street}, {kycData.address?.city}, {kycData.address?.state} - {kycData.address?.pincode}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Document Type</p>
                  <p className="text-white capitalize">{kycData.documentType?.replace('_', ' ')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Submitted On</p>
                  <p className="text-white">{kycData.submittedAt ? new Date(kycData.submittedAt).toLocaleDateString('en-IN') : '-'}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Wallet Tab */}
      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {/* Payment Success Message */}
          {paymentSuccessMessage && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="text-green-400 font-medium">{paymentSuccessMessage}</p>
              <button 
                onClick={() => setPaymentSuccessMessage(null)}
                className="ml-auto text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          
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
                            min="100"
                            max="10000000"
                            step="1"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                            placeholder="Enter amount (min ₹100)"
                          />
                        </div>
                        <p className="text-xs text-gray-500">Minimum deposit: ₹100 • Maximum: ₹1,00,00,000</p>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {[500, 1000, 5000, 10000, 50000].map((amount) => (
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
                    <div className="text-center py-8 px-4">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 flex items-center justify-center mx-auto">
                          <Shield className="w-10 h-10 text-yellow-500" />
                        </div>
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">
                        KYC Verification Required
                      </h4>
                      <p className="text-gray-400 mb-2 max-w-sm mx-auto">
                        Complete your identity verification to unlock withdrawal features and secure your account.
                      </p>
                      <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mb-6">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Secure Process
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-blue-500" />
                          24-48 hrs Review
                        </span>
                      </div>
                      <Button
                        onClick={() => setActiveTab('kyc')}
                        className="relative group bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-semibold px-8 py-3 rounded-lg shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all duration-300 transform hover:scale-105"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity"></span>
                        <Shield className="w-5 h-5 mr-2 inline-block" />
                        Complete Verification
                        <ArrowUpRight className="w-4 h-4 ml-2 inline-block group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </Button>
                      <p className="text-xs text-gray-600 mt-4">
                        Required documents: PAN Card, Aadhaar/Passport/Voter ID
                      </p>
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
                            min="60"
                            max={availableBalance}
                            step="1"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                            placeholder="Enter amount (min ₹60)"
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Available: {formatCurrency(availableBalance)} • Fee: 1.5% • Min: ₹60
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

                      {Number.parseFloat(withdrawAmount || '0') >= 60 && (
                        <div className="p-4 bg-zinc-800 rounded-lg space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Withdrawal Amount</span>
                            <span className="text-white font-medium">{formatCurrency(Number.parseFloat(withdrawAmount || '0'))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Processing Fee (1.5%)</span>
                            <span className="text-red-400">-{formatCurrency(withdrawalFee)}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t border-zinc-700 pt-3">
                            <span className="text-white">You'll Receive</span>
                            <span className="text-green-400 text-lg">
                              {formatCurrency(Number.parseFloat(withdrawAmount || '0') - withdrawalFee)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 pt-2 border-t border-zinc-700">
                            Funds typically arrive within 1-3 business days
                          </p>
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
                <div>
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Building className="w-5 h-5 text-red-500" />
                    Add New Bank Account
                  </h4>
                  <p className="text-sm text-gray-400 mt-1">Link your Indian bank account for withdrawals</p>
                </div>
                <button onClick={() => { setShowAddBank(false); setBankFormError(''); setBankFormSuccess(''); }} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error/Success Messages */}
              {bankFormError && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{bankFormError}</p>
                </div>
              )}
              {bankFormSuccess && (
                <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                  <p className="text-green-400 text-sm">{bankFormSuccess}</p>
                </div>
              )}
              
              <form onSubmit={handleAddBankAccount} className="space-y-5">
                {/* Account Holder Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Account Holder Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={newBankData.accountHolderName}
                      onChange={(e) => setNewBankData({ ...newBankData, accountHolderName: e.target.value })}
                      className="pl-10 bg-zinc-800 border-zinc-700 text-white"
                      placeholder="As per bank records"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">Name should match exactly as on your bank account</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bank Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newBankData.bankName}
                      onChange={(e) => setNewBankData({ ...newBankData, bankName: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                      required
                    >
                      <option value="">Select your bank</option>
                      {popularBanks.map((bank) => (
                        <option key={bank} value={bank}>{bank}</option>
                      ))}
                    </select>
                  </div>

                  {/* Account Type */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Account Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newBankData.accountType}
                      onChange={(e) => setNewBankData({ ...newBankData, accountType: e.target.value as 'SAVING' | 'CURRENT' })}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                    >
                      <option value="SAVING">Savings Account</option>
                      <option value="CURRENT">Current Account</option>
                    </select>
                  </div>
                </div>

                {/* IFSC Code */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    IFSC Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      value={newBankData.routingNumber}
                      onChange={(e) => setNewBankData({ ...newBankData, routingNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })}
                      className={`bg-zinc-800 border-zinc-700 text-white font-mono ${
                        newBankData.routingNumber && !validateIFSC(newBankData.routingNumber) 
                          ? 'border-red-500/50' 
                          : newBankData.routingNumber && validateIFSC(newBankData.routingNumber) 
                          ? 'border-green-500/50' 
                          : ''
                      }`}
                      placeholder="SBIN0001234"
                      maxLength={11}
                      required
                    />
                    {newBankData.routingNumber && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {validateIFSC(newBankData.routingNumber) ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    11 characters: Bank code (4 letters) + 0 + Branch code (6 alphanumeric). 
                    <a href="https://bankifsccode.com/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 ml-1">
                      Find your IFSC →
                    </a>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Account Number */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showAccountNumber ? 'text' : 'password'}
                        value={newBankData.accountNumber}
                        onChange={(e) => setNewBankData({ ...newBankData, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 18) })}
                        className="bg-zinc-800 border-zinc-700 text-white pr-10 font-mono"
                        placeholder="Enter 9-18 digit account number"
                        maxLength={18}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccountNumber(!showAccountNumber)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Account Number */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Confirm Account Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmAccountNumber ? 'text' : 'password'}
                        value={newBankData.confirmAccountNumber}
                        onChange={(e) => setNewBankData({ ...newBankData, confirmAccountNumber: e.target.value.replace(/\D/g, '').slice(0, 18) })}
                        className={`bg-zinc-800 border-zinc-700 text-white pr-10 font-mono ${
                          newBankData.confirmAccountNumber && newBankData.accountNumber !== newBankData.confirmAccountNumber 
                            ? 'border-red-500/50' 
                            : newBankData.confirmAccountNumber && newBankData.accountNumber === newBankData.confirmAccountNumber 
                            ? 'border-green-500/50' 
                            : ''
                        }`}
                        placeholder="Re-enter account number"
                        maxLength={18}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmAccountNumber(!showConfirmAccountNumber)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showConfirmAccountNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {newBankData.confirmAccountNumber && newBankData.accountNumber !== newBankData.confirmAccountNumber && (
                      <p className="text-xs text-red-400">Account numbers don't match</p>
                    )}
                  </div>
                </div>

                {/* Set as Default */}
                <div className="flex items-center space-x-2 p-3 bg-zinc-800/50 rounded-lg">
                  <input
                    type="checkbox"
                    id="setDefault"
                    checked={newBankData.setAsDefault}
                    onChange={(e) => setNewBankData({ ...newBankData, setAsDefault: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-red-600 focus:ring-red-600"
                  />
                  <label htmlFor="setDefault" className="text-sm text-gray-300">
                    Set as default bank account for withdrawals
                  </label>
                </div>

                {/* Security Notice */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-blue-400 text-sm font-medium">Secure Bank Linking</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Your bank details are encrypted and stored securely. We only store the last 4 digits of your account number for display purposes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading || session?.user?.kycStatus !== 'VERIFIED'}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding Bank Account...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Bank Account
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => { setShowAddBank(false); setBankFormError(''); setBankFormSuccess(''); }}
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
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building className="w-10 h-10 text-gray-500" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">No Bank Accounts Linked</h4>
                <p className="text-gray-400 mb-4 max-w-sm mx-auto">
                  Add a bank account to enable withdrawals and receive your earnings directly to your bank.
                </p>
                {session?.user?.kycStatus === 'VERIFIED' ? (
                  <Button
                    onClick={() => setShowAddBank(true)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Bank Account
                  </Button>
                ) : (
                  <Button
                    onClick={() => setActiveTab('kyc')}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Complete KYC First
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <Card key={account.id} className={`bg-zinc-900 border-zinc-800 p-5 transition-all ${
                  account.isDefault ? 'ring-1 ring-blue-500/30' : ''
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        account.isVerified ? 'bg-green-500/10' : 'bg-zinc-800'
                      }`}>
                        <Building className={`w-7 h-7 ${account.isVerified ? 'text-green-500' : 'text-gray-400'}`} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <p className="font-semibold text-white text-lg">{account.bankName}</p>
                          {account.isDefault && (
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20 font-medium">
                              Default
                            </span>
                          )}
                          {getStatusBadge(account.status)}
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          <span className="text-gray-300 font-mono">****{account.accountNumberLast4}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400">{account.accountType === 'SAVING' ? 'Savings' : 'Current'}</span>
                        </div>
                        <p className="text-sm text-gray-500">{account.accountHolderName}</p>
                        <p className="text-xs text-gray-600">Added on {new Date(account.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!account.isDefault && account.isVerified && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetDefaultBank(account.id)}
                          className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteBankAccount(account.id)}
                        className="bg-zinc-800 border-zinc-700 hover:bg-red-600/20 text-red-400 hover:text-red-300 hover:border-red-600/30"
                        title="Remove bank account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Status Message */}
                  {account.status === 'PENDING' && (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-500" />
                      <p className="text-xs text-yellow-400">Verification in progress. This usually takes 1-2 business days.</p>
                    </div>
                  )}
                  {account.status === 'FAILED' && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <p className="text-xs text-red-400">Verification failed. Please remove and re-add with correct details.</p>
                    </div>
                  )}
                </Card>
              ))}
              
              {/* Add More Button */}
              {bankAccounts.length < 5 && session?.user?.kycStatus === 'VERIFIED' && (
                <button
                  onClick={() => setShowAddBank(true)}
                  className="w-full p-4 border-2 border-dashed border-zinc-700 rounded-lg hover:border-red-600/50 hover:bg-zinc-800/30 transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-white"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Another Bank Account</span>
                </button>
              )}
              
              {/* Info Box */}
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-xs text-gray-500 text-center">
                  You can add up to 5 bank accounts. Only verified accounts can be used for withdrawals.
                </p>
              </div>
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

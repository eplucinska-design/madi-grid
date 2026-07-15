'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Delete, Loader2, Mail, Lock, Eye, EyeOff, Users, KeyRound, Check, Shield, Clock, BarChart3, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuthStore, DEMO_USERS } from '@/lib/store/auth-store'

type LoginMode = 'pin' | 'email'

export function LoginScreen() {
  const [loginMode, setLoginMode] = useState<LoginMode>('pin')
  const [selectedUser, setSelectedUser] = useState<typeof DEMO_USERS[0] | null>(null)
  const [usersExpanded, setUsersExpanded] = useState(false)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  
  // Email login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const { login, loginWithPin, isLoading, error, clearError } = useAuthStore()
  const visibleUsers = usersExpanded ? DEMO_USERS : DEMO_USERS.slice(0, 6)
  const hiddenUsersCount = Math.max(0, DEMO_USERS.length - visibleUsers.length)

  // Handle PIN input
  const handlePinInput = useCallback((digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit
      setPin(newPin)
      
      // Auto-submit when 4 digits entered
      if (newPin.length === 4 && selectedUser) {
        loginWithPin(selectedUser.id, newPin).then(success => {
          if (!success) {
            setShake(true)
            setTimeout(() => {
              setShake(false)
              setPin('')
            }, 500)
          }
        })
      }
    }
  }, [pin, selectedUser, loginWithPin])

  // Handle backspace
  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1))
    clearError()
  }, [clearError])

  // Keyboard support for PIN
  useEffect(() => {
    if (!selectedUser || loginMode !== 'pin') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handlePinInput(e.key)
      } else if (e.key === 'Backspace') {
        handleBackspace()
      } else if (e.key === 'Escape') {
        setSelectedUser(null)
        setPin('')
        clearError()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedUser, loginMode, handlePinInput, handleBackspace, clearError])

  const handleUserSelect = (user: typeof DEMO_USERS[0]) => {
    setSelectedUser(user)
    setUsersExpanded(false)
    setPin('')
    clearError()
  }

  const handleBack = () => {
    setSelectedUser(null)
    setPin('')
    clearError()
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(email, password, rememberMe)
  }

  const handleModeSwitch = (mode: LoginMode) => {
    setLoginMode(mode)
    setSelectedUser(null)
    setUsersExpanded(false)
    setPin('')
    setEmail('')
    setPassword('')
    clearError()
  }

  return (
    <div className="fixed inset-0 z-[5000] bg-[#0a0a09] text-[#f4f4ef] overflow-hidden flex">
      {/* Left side - Login form */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center w-10 h-10 rounded-xl bg-[#f4f4ef] text-[#11110f] shadow-[0_12px_30px_rgba(0,0,0,0.28)]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight">MADI GRID</span>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-10">
          <div className="w-full max-w-md">
            {/* Mode toggle tabs */}
            <div className="flex gap-2 p-1 bg-white/[0.05] rounded-xl mb-8">
              <button
                onClick={() => handleModeSwitch('pin')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  loginMode === 'pin'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Users size={18} />
                Wybierz pracownika
              </button>
              <button
                onClick={() => handleModeSwitch('email')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                  loginMode === 'email'
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Mail size={18} />
                Email i PIN
              </button>
            </div>

            {loginMode === 'pin' ? (
              // PIN Login Mode
              !selectedUser ? (
                // User selection
                <>
                  <h1 className="text-2xl font-bold tracking-tight mb-2">Wybierz swoje konto</h1>
                  <p className="text-white/50 text-sm mb-6">Kliknij swój profil i wpisz przypisany PIN.</p>
                  
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015]">
                    <div className={`grid grid-cols-2 gap-3 p-2 pr-1.5 ${usersExpanded ? 'max-h-[360px] overflow-y-auto' : ''}`}>
                      {visibleUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="group flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.07]"
                        >
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                            style={{ 
                              background: `linear-gradient(135deg, ${user.avatarColor}, ${user.avatarColor}dd)`,
                            }}
                          >
                            {user.initials}
                          </div>
                          <div className="text-left min-w-0">
                            <p className="font-medium text-white text-sm truncate">{user.name}</p>
                            <p className="text-xs text-white/45 truncate">{user.department}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setUsersExpanded((expanded) => !expanded)}
                      className="flex h-11 w-full items-center justify-center gap-2 border-t border-white/[0.06] text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white"
                    >
                      {usersExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {usersExpanded
                        ? 'Zwiń listę pracowników'
                        : hiddenUsersCount > 0
                          ? `Rozwiń listę - jeszcze ${hiddenUsersCount}`
                          : 'Rozwiń listę pracowników'}
                    </button>
                  </div>

                  <p className="text-white/30 text-xs mt-6 text-center">
                    Dostęp jest przypisany do profilu pracownika.
                  </p>
                </>
              ) : (
                // PIN entry
                <div className="flex flex-col items-center">
                  {/* Back button */}
                  <button
                    onClick={handleBack}
                    className="self-start flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6"
                  >
                    <ArrowLeft size={18} />
                    <span className="text-sm font-medium">Powrót</span>
                  </button>

                  {/* Selected user */}
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4"
                    style={{ 
                      background: `linear-gradient(135deg, ${selectedUser.avatarColor}, ${selectedUser.avatarColor}dd)`,
                      boxShadow: `0 12px 40px ${selectedUser.avatarColor}40`
                    }}
                  >
                    {selectedUser.initials}
                  </div>
                  <h2 className="text-xl font-bold mb-1">{selectedUser.name}</h2>
                  <p className="text-white/50 text-sm mb-6">{selectedUser.department}</p>

                  {/* PIN display */}
                  <div className={`flex gap-3 mb-4 ${shake ? 'animate-shake' : ''}`}>
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all duration-150 ${
                          pin.length > i
                            ? 'border-primary bg-primary/20 text-white'
                            : pin.length === i
                            ? 'border-white/30 bg-white/[0.05]'
                            : 'border-white/10 bg-white/[0.02]'
                        }`}
                      >
                        {pin.length > i ? '•' : ''}
                      </div>
                    ))}
                  </div>

                  {/* Error message */}
                  <div className="h-6 mb-4">
                    {error && (
                      <p className="text-red-400 text-sm animate-pulse">{error}</p>
                    )}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-white/60">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Logowanie...</span>
                      </div>
                    )}
                  </div>

                  {/* Numeric keypad */}
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((key, index) => {
                      if (key === '') {
                        return <div key={index} className="w-14 h-14" />
                      }
                      
                      if (key === 'back') {
                        return (
                          <button
                            key={index}
                            onClick={handleBackspace}
                            disabled={pin.length === 0 || isLoading}
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Delete size={20} />
                          </button>
                        )
                      }

                      return (
                        <button
                          key={index}
                          onClick={() => handlePinInput(key)}
                          disabled={pin.length >= 4 || isLoading}
                          className="w-14 h-14 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.1] hover:border-white/[0.2] text-lg font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {key}
                        </button>
                      )
                    })}
                  </div>

                  <p className="text-white/30 text-xs mt-6">
                    Użyj klawiatury numerycznej lub kliknij cyfry
                  </p>
                </div>
              )
            ) : (
              // Email Login Mode
              <>
                <h1 className="text-2xl font-bold tracking-tight mb-2">Zaloguj się</h1>
                <p className="text-white/50 text-sm mb-6">Wprowadź email oraz PIN przypisany do profilu.</p>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                  {/* Email field */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="np. emilia.plucinska"
                        className="w-full h-12 pl-12 pr-4 rounded-xl border border-white/[0.1] bg-white/[0.04] text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">
                      PIN
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="4-cyfrowy PIN"
                        className="w-full h-12 pl-12 pr-12 rounded-xl border border-white/[0.1] bg-white/[0.04] text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember me & Forgot password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div 
                        onClick={() => setRememberMe(!rememberMe)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          rememberMe 
                            ? 'bg-primary border-primary' 
                            : 'border-white/20 hover:border-white/40'
                        }`}
                      >
                        {rememberMe && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-sm text-white/60">Zapamiętaj mnie</span>
                    </label>
                    <button type="button" className="text-sm text-primary hover:text-primary/80 transition-colors">
                      Reset PIN
                    </button>
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Logowanie...
                      </>
                    ) : (
                      'Zaloguj się'
                    )}
                  </button>

                  <p className="text-white/30 text-xs text-center mt-4">
                    Wersja lokalna wymaga PIN-u przypisanego do profilu.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center py-4">
          <p className="text-white/20 text-xs">
            MADI GRID - System zarządzania drukarnią
          </p>
        </div>
      </div>

      {/* Right side - Preview panel (hidden on mobile) */}
      <div className="hidden lg:flex w-[480px] bg-white/[0.02] border-l border-white/[0.06] flex-col p-8">
        <div className="flex-1 flex flex-col justify-center">
          <div className="space-y-8">
            {/* Feature 1 */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Szybkie logowanie PIN</h3>
                <p className="text-sm text-white/50">Wybierz swój profil i wpisz 4-cyfrowy PIN, aby natychmiast rozpocząć pracę.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Bezpieczeństwo i role</h3>
                <p className="text-sm text-white/50">Każdy użytkownik ma przypisane uprawnienia zgodne z jego stanowiskiem.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Śledzenie czasu pracy</h3>
                <p className="text-sm text-white/50">Automatyczne logowanie czasu przy zleceniach i raportowanie wydajności.</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Pełna kontrola produkcji</h3>
                <p className="text-sm text-white/50">Zarządzaj zleceniami od przyjęcia do wysyłki w jednym miejscu.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats preview */}
        <div className="mt-auto pt-8 border-t border-white/[0.06]">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">1,247</p>
              <p className="text-xs text-white/40">Zleceń w tym miesiącu</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">98.5%</p>
              <p className="text-xs text-white/40">Terminowość</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">24</p>
              <p className="text-xs text-white/40">Aktywnych użytkowników</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shake animation */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}

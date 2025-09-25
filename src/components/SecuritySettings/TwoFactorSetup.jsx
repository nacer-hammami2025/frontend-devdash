import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function TwoFactorSetup() {
  const { setup2FA, verify2FA, disable2FA } = useAuth();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [backupCodes, setBackupCodes] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await setup2FA();
      setQrCode(response.qrCode);
      setBackupCodes(response.backupCodes);
      setIsSettingUp(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await verify2FA(verificationCode);
      setSuccess('2FA has been successfully enabled');
      setIsSettingUp(false);
      setQrCode(null);
      setBackupCodes(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    try {
      setLoading(true);
      setError(null);
      await disable2FA();
      setSuccess('2FA has been disabled');
      setIsSettingUp(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {!isSettingUp ? (
        <div>
          <p className="mb-4 text-gray-600">
            Add an extra layer of security to your account by enabling two-factor authentication.
          </p>
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Setup 2FA'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {qrCode && (
            <div className="text-center">
              <p className="mb-2 font-medium">Scan this QR code with your authenticator app:</p>
              <img src={qrCode} alt="2FA QR Code" className="mx-auto" style={{ maxWidth: '200px' }} />
            </div>
          )}

          {backupCodes && (
            <div>
              <p className="font-medium mb-2">Save these backup codes in a safe place:</p>
              <div className="bg-gray-100 p-3 rounded grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <code key={index} className="font-mono text-sm">
                    {code}
                  </code>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                type="text"
                id="code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !verificationCode}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSettingUp(false);
                  setQrCode(null);
                  setBackupCodes(null);
                  setVerificationCode('');
                }}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

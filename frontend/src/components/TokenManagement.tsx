import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  generateUserToken, 
  updateUserToken, 
  revokeUserToken, 
  validateToken,
  maskToken,
  copyToClipboard,
  type TokenValidation 
} from '../services/tokenService';
import { User } from '../services/userService';

interface TokenManagementProps {
  user: User;
  onTokenUpdate?: (username: string, token?: string) => void;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

const TokenManagement: React.FC<TokenManagementProps> = ({
  user,
  onTokenUpdate,
  onError,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showFullToken, setShowFullToken] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [showCustomTokenInput, setShowCustomTokenInput] = useState(false);
  const [tokenValidation, setTokenValidation] = useState<TokenValidation | null>(null);

  const handleGenerateToken = async () => {
    setIsLoading(true);
    try {
      const newToken = await generateUserToken(user.username);
      onTokenUpdate?.(user.username, newToken);
      onSuccess?.(t('tokens.generateSuccess'));
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t('tokens.generateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateToken = async () => {
    if (!customToken.trim()) {
      onError?.(t('tokens.emptyTokenError'));
      return;
    }

    setIsLoading(true);
    try {
      await updateUserToken(user.username, customToken);
      onTokenUpdate?.(user.username, customToken);
      setCustomToken('');
      setShowCustomTokenInput(false);
      onSuccess?.(t('tokens.updateSuccess'));
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t('tokens.updateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeToken = async () => {
    if (!window.confirm(t('tokens.revokeConfirm'))) {
      return;
    }

    setIsLoading(true);
    try {
      await revokeUserToken(user.username);
      onTokenUpdate?.(user.username, undefined);
      onSuccess?.(t('tokens.revokeSuccess'));
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t('tokens.revokeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!user.accessToken) return;
    
    const success = await copyToClipboard(user.accessToken);
    if (success) {
      onSuccess?.(t('tokens.copySuccess'));
    } else {
      onError?.(t('tokens.copyError'));
    }
  };

  const handleValidateToken = async () => {
    if (!customToken.trim()) {
      onError?.(t('tokens.emptyTokenError'));
      return;
    }

    setIsLoading(true);
    try {
      const validation = await validateToken(customToken);
      setTokenValidation(validation);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t('tokens.validateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const displayToken = user.accessToken 
    ? (showFullToken ? user.accessToken : maskToken(user.accessToken))
    : t('tokens.noToken');

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('tokens.title')}
        </h3>
        {user.accessToken && (
          <button
            onClick={() => setShowFullToken(!showFullToken)}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            disabled={isLoading}
          >
            {showFullToken ? t('tokens.hide') : t('tokens.show')}
          </button>
        )}
      </div>

      {/* Token Display */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="flex-1 p-3 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
            <code className="text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
              {displayToken}
            </code>
          </div>
          {user.accessToken && (
            <button
              onClick={handleCopyToken}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading}
              title={t('tokens.copy')}
            >
              📋
            </button>
          )}
        </div>
      </div>

      {/* Token Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGenerateToken}
          className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? t('common.loading') : t('tokens.generate')}
        </button>

        <button
          onClick={() => setShowCustomTokenInput(!showCustomTokenInput)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isLoading}
        >
          {t('tokens.update')}
        </button>

        {user.accessToken && (
          <button
            onClick={handleRevokeToken}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            disabled={isLoading}
          >
            {t('tokens.revoke')}
          </button>
        )}
      </div>

      {/* Custom Token Input */}
      {showCustomTokenInput && (
        <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {t('tokens.customToken')}
          </h4>
          <div className="space-y-2">
            <input
              type="text"
              value={customToken}
              onChange={(e) => setCustomToken(e.target.value)}
              placeholder={t('tokens.enterToken')}
              className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isLoading}
            />
            <div className="flex space-x-2">
              <button
                onClick={handleUpdateToken}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={isLoading || !customToken.trim()}
              >
                {t('tokens.save')}
              </button>
              <button
                onClick={handleValidateToken}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                disabled={isLoading || !customToken.trim()}
              >
                {t('tokens.validate')}
              </button>
              <button
                onClick={() => {
                  setShowCustomTokenInput(false);
                  setCustomToken('');
                  setTokenValidation(null);
                }}
                className="px-3 py-1 text-sm bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>

          {/* Token Validation Result */}
          {tokenValidation && (
            <div className={`p-2 rounded text-sm ${
              tokenValidation.valid 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {tokenValidation.valid ? (
                <div>
                  ✅ {t('tokens.validToken')}
                  {tokenValidation.username && (
                    <span className="block mt-1">
                      {t('tokens.belongsTo')}: <strong>{tokenValidation.username}</strong>
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  ❌ {t('tokens.invalidToken')}
                  {tokenValidation.error && (
                    <span className="block mt-1 text-xs">
                      {tokenValidation.error}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenManagement; 
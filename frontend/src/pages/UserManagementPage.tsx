import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  updateUserStatus,
  type User,
  type CreateUserRequest,
  type UpdateUserRequest 
} from '../services/userService';
import { getUsersWithTokens } from '../services/tokenService';
import TokenManagement from '../components/TokenManagement';

interface CreateUserFormData extends CreateUserRequest {
  confirmPassword: string;
}

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [expandedUserTokens, setExpandedUserTokens] = useState<Set<string>>(new Set());

  // Create user form state
  const [createFormData, setCreateFormData] = useState<CreateUserFormData>({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    fullName: '',
    isAdmin: false,
  });

  // Edit user form state
  const [editFormData, setEditFormData] = useState<UpdateUserRequest>({
    email: '',
    fullName: '',
    isAdmin: false,
  });

  // Load users data
  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getUsersWithTokens();
      setUsers(usersData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Auto-clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Handle user creation
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (createFormData.password !== createFormData.confirmPassword) {
      setError(t('users.passwordMismatch'));
      return;
    }

    try {
      const { confirmPassword, ...userData } = createFormData;
      await createUser(userData);
      await loadUsers();
      setSuccess(t('users.createSuccess'));
      setShowCreateForm(false);
      setCreateFormData({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        fullName: '',
        isAdmin: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.createError'));
    }
  };

  // Handle user update
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateUser(editingUser.username, editFormData);
      await loadUsers();
      setSuccess(t('users.updateSuccess'));
      setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.updateError'));
    }
  };

  // Handle user status toggle
  const handleToggleUserStatus = async (username: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    
    try {
      await updateUserStatus(username, newStatus);
      await loadUsers();
      setSuccess(t('users.statusUpdateSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.statusUpdateError'));
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(t('users.deleteConfirm', { username }))) {
      return;
    }

    try {
      await deleteUser(username);
      await loadUsers();
      setSuccess(t('users.deleteSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.deleteError'));
    }
  };

  // Handle token management
  const handleTokenUpdate = async (username: string, token?: string) => {
    await loadUsers();
  };

  // Toggle token visibility
  const toggleTokenExpansion = (username: string) => {
    const newExpanded = new Set(expandedUserTokens);
    if (newExpanded.has(username)) {
      newExpanded.delete(username);
    } else {
      newExpanded.add(username);
    }
    setExpandedUserTokens(newExpanded);
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email || '',
      fullName: user.fullName || '',
      isAdmin: user.isAdmin,
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('users.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('users.description')}
        </p>
      </div>

      {/* Messages */}
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

      {/* Search and Create Button */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('users.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('users.createUser')}
        </button>
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {t('users.createUser')}
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users.username')} *
                </label>
                <input
                  type="text"
                  value={createFormData.username}
                  onChange={(e) => setCreateFormData({...createFormData, username: e.target.value})}
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users.password')} *
                </label>
                <input
                  type="password"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({...createFormData, password: e.target.value})}
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users.confirmPassword')} *
                </label>
                <input
                  type="password"
                  value={createFormData.confirmPassword}
                  onChange={(e) => setCreateFormData({...createFormData, confirmPassword: e.target.value})}
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users.email')}
                </label>
                <input
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({...createFormData, email: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users.fullName')}
                </label>
                <input
                  type="text"
                  value={createFormData.fullName}
                  onChange={(e) => setCreateFormData({...createFormData, fullName: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={createFormData.isAdmin}
                  onChange={(e) => setCreateFormData({...createFormData, isAdmin: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="isAdmin" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('users.admin')}
                </label>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {t('users.create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {t('users.editUser')}: {editingUser.username}
            </h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users.email')}
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users.fullName')}
                </label>
                <input
                  type="text"
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsAdmin"
                  checked={editFormData.isAdmin}
                  onChange={(e) => setEditFormData({...editFormData, isAdmin: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="editIsAdmin" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('users.admin')}
                </label>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {t('users.update')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('users.username')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('users.email')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('users.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('users.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('users.lastActivity')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('users.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <React.Fragment key={user.username}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.username}
                            </div>
                            {user.fullName && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.fullName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {user.status === 'active' ? t('users.active') : t('users.disabled')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.isAdmin ? t('users.admin') : t('users.user')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.lastActivity 
                          ? new Date(user.lastActivity).toLocaleString()
                          : t('users.never')
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleStartEdit(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {t('users.edit')}
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(user.username, user.status)}
                          className={`${
                            user.status === 'active' 
                              ? 'text-yellow-600 hover:text-yellow-900 dark:text-yellow-400'
                              : 'text-green-600 hover:text-green-900 dark:text-green-400'
                          }`}
                        >
                          {user.status === 'active' ? t('users.disable') : t('users.enable')}
                        </button>
                        <button
                          onClick={() => toggleTokenExpansion(user.username)}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                        >
                          {expandedUserTokens.has(user.username) ? t('tokens.hide') : t('tokens.manage')}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.username)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          {t('users.delete')}
                        </button>
                      </td>
                    </tr>
                    {expandedUserTokens.has(user.username) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-700">
                          <TokenManagement
                            user={user}
                            onTokenUpdate={handleTokenUpdate}
                            onError={setError}
                            onSuccess={setSuccess}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? t('users.noUsersFound') : t('users.noUsers')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagementPage; 
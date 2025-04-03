// 定义DeleteDialog组件并将其暴露为全局变量
window.DeleteDialog = function DeleteDialog({ isOpen, onClose, onConfirm, serverName }) {
  return (
    <div className={`${isOpen ? 'block' : 'hidden'} fixed inset-0 bg-black bg-opacity-50 z-50`}>
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-auto">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Delete Server</h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              Are you sure you want to delete server {serverName}? This action cannot be undone.
            </p>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

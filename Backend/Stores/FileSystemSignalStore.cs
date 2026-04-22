using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Backend.Stores
{
    /// <summary>
    /// Implements thread-safe file-based storage for the WhatsApp Signal session states.
    /// Uses SemaphoreSlim to handle concurrent read/writes asynchronously to the same JSON file
    /// which is crucial for the continuous handshake and message sequence updates.
    /// </summary>
    public class FileSystemSignalStore : ISignalSessionStore, IDisposable
    {
        private readonly string _storageDirectory;
        private readonly SemaphoreSlim _lock = new SemaphoreSlim(1, 1);

        public FileSystemSignalStore(string storageDirectory)
        {
            _storageDirectory = storageDirectory ?? throw new ArgumentNullException(nameof(storageDirectory));
            if (!Directory.Exists(_storageDirectory))
            {
                Directory.CreateDirectory(_storageDirectory);
            }
        }

        private string GetFilePath(string sessionId)
        {
            var safeSessionId = Path.GetInvalidFileNameChars().Aggregate(sessionId, (current, c) => current.Replace(c.ToString(), string.Empty));
            return Path.Combine(_storageDirectory, $"{safeSessionId}.json");
        }

        public async Task SaveSessionAsync(string sessionId, string stateJson)
        {
            var filePath = GetFilePath(sessionId);

            await _lock.WaitAsync();
            try
            {
                using (var stream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 4096, useAsync: true))
                using (var writer = new StreamWriter(stream))
                {
                    await writer.WriteAsync(stateJson);
                }
            }
            finally
            {
                _lock.Release();
            }
        }

        public async Task<string> GetSessionAsync(string sessionId)
        {
            var filePath = GetFilePath(sessionId);
            
            await _lock.WaitAsync();
            try
            {
                if (!File.Exists(filePath)) return null;

                using (var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 4096, useAsync: true))
                using (var reader = new StreamReader(stream))
                {
                    return await reader.ReadToEndAsync();
                }
            }
            finally
            {
                _lock.Release();
            }
        }

        public async Task DeleteSessionAsync(string sessionId)
        {
            var filePath = GetFilePath(sessionId);
            
            await _lock.WaitAsync();
            try
            {
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }
            finally
            {
                _lock.Release();
            }
        }

        public void Dispose()
        {
            _lock?.Dispose();
        }
    }
}

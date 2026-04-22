using System.Threading.Tasks;

namespace Backend.Stores
{
    public interface ISignalSessionStore
    {
        Task SaveSessionAsync(string sessionId, string stateJson);
        Task<string> GetSessionAsync(string sessionId);
        Task DeleteSessionAsync(string sessionId);
    }
}

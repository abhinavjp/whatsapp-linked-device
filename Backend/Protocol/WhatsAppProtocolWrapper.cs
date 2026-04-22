using System;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;

namespace Backend.Protocol
{
    /// <summary>
    /// Proxies messages between the Angular frontend and the Node.js WhatsApp microservice.
    /// This implementation follows the Proxy/Gateway pattern to ensure the .NET backend
    /// remains the sole public interface while delegating protocol complexity to Node.js.
    /// </summary>
    public class WhatsAppProtocolWrapper
    {
        private readonly WebSocket _frontendSocket;
        private readonly ClientWebSocket _nodeSocket;
        private readonly CancellationTokenSource _cts = new CancellationTokenSource();

        public WhatsAppProtocolWrapper(WebSocket frontendSocket)
        {
            _frontendSocket = frontendSocket ?? throw new ArgumentNullException(nameof(frontendSocket));
            _nodeSocket = new ClientWebSocket();
        }

        /// <summary>
        /// Starts the proxy session, bridging the two WebSockets.
        /// </summary>
        public async Task StartProxyAsync()
        {
            try
            {
                // Connect to the local Node.js microservice
                await _nodeSocket.ConnectAsync(new Uri("ws://localhost:3000"), CancellationToken.None);
                Console.WriteLine("[WhatsAppProtocolWrapper] Connected to Node.js microservice.");

                // Start two concurrent loops: one for each direction of traffic
                var nodeToFrontTask = ProxyNodeToFrontend();
                var frontToNodeTask = ProxyFrontendToNode();

                // Wait for either connection to close
                await Task.WhenAny(nodeToFrontTask, frontToNodeTask);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WhatsAppProtocolWrapper] Proxy Error: {ex.Message}");
            }
            finally
            {
                _cts.Cancel();
                await CleanupSockets();
            }
        }

        private async Task ProxyNodeToFrontend()
        {
            var buffer = new byte[8192];
            try
            {
                while (_nodeSocket.State == WebSocketState.Open && !_cts.Token.IsCancellationRequested)
                {
                    var result = await _nodeSocket.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);
                    
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        Console.WriteLine("[WhatsAppProtocolWrapper] Node.js closed connection.");
                        break;
                    }

                    if (_frontendSocket.State == WebSocketState.Open)
                    {
                        await _frontendSocket.SendAsync(new ArraySegment<byte>(buffer, 0, result.Count), result.MessageType, result.EndOfMessage, _cts.Token);
                    }
                }
            }
            catch (OperationCanceledException) { }
        }

        private async Task ProxyFrontendToNode()
        {
            var buffer = new byte[8192];
            try
            {
                while (_frontendSocket.State == WebSocketState.Open && !_cts.Token.IsCancellationRequested)
                {
                    var result = await _frontendSocket.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);
                    
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        Console.WriteLine("[WhatsAppProtocolWrapper] Frontend closed connection.");
                        break;
                    }

                    if (_nodeSocket.State == WebSocketState.Open)
                    {
                        await _nodeSocket.SendAsync(new ArraySegment<byte>(buffer, 0, result.Count), result.MessageType, result.EndOfMessage, _cts.Token);
                    }
                }
            }
            catch (OperationCanceledException) { }
        }

        private async Task CleanupSockets()
        {
            if (_nodeSocket.State == WebSocketState.Open)
                await _nodeSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
            
            if (_frontendSocket.State == WebSocketState.Open)
                await _frontendSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
            
            _nodeSocket.Dispose();
            _cts.Dispose();
        }
    }
}

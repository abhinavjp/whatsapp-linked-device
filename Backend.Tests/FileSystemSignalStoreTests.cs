using NUnit.Framework;
using System;
using System.IO;
using System.Threading.Tasks;
using System.Collections.Generic;
using Backend.Stores;

namespace Backend.Tests
{
    [TestFixture]
    public class FileSystemSignalStoreTests
    {
        private string _testDir;
        private FileSystemSignalStore _store;

        [SetUp]
        public void Setup()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "WhatsAppStoreTests_" + Guid.NewGuid().ToString());
            _store = new FileSystemSignalStore(_testDir);
        }

        [TearDown]
        public void Teardown()
        {
            _store.Dispose();
            if (Directory.Exists(_testDir))
            {
                Directory.Delete(_testDir, true);
            }
        }

        [Test]
        public async Task SaveSessionAsync_ConcurrentWrites_MaintainsDataIntegrity()
        {
            var sessionId = "test-session";
            var tasks = new List<Task>();
            
            // Spawn 50 concurrent writes
            for (int i = 0; i < 50; i++)
            {
                int index = i;
                tasks.Add(Task.Run(() => _store.SaveSessionAsync(sessionId, $"{{ \"index\": {index} }}")));
            }

            await Task.WhenAll(tasks);

            var finalContent = await _store.GetSessionAsync(sessionId);
            Assert.IsNotNull(finalContent);
            Assert.IsTrue(finalContent.Contains("\"index\":"));
        }

        [Test]
        public async Task GetSessionAsync_NonExistentSession_ReturnsNull()
        {
            var content = await _store.GetSessionAsync("missing");
            Assert.IsNull(content);
        }
    }
}

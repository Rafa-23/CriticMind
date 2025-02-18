document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['apiKey'], (result) => {
      document.getElementById('api-key').value = result.apiKey || '';
    });
  
    document.getElementById('save-settings').addEventListener('click', () => {
      const apiKey = document.getElementById('api-key').value;
      chrome.storage.local.set({ apiKey }, () => {
        alert('Settings saved!');
      });
    });
  });
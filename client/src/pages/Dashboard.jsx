import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function Dashboard() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  const token = localStorage.getItem('token');

  const fetchContents = async (folderId) => {
    try {
      const url = folderId
        ? `${API_URL}/api/folders/contents?parentFolder=${folderId}`
        : `${API_URL}/api/folders/contents`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFolders(data.folders);
      setFiles(data.files);
    } catch (err) {
      setMessage('Could not load contents.');
    }
  };

  useEffect(() => {
    fetchContents(currentFolder);
  }, [currentFolder]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await fetch(`${API_URL}/api/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newFolderName, parentFolder: currentFolder }),
      });
      setNewFolderName('');
      fetchContents(currentFolder);
    } catch (err) {
      setMessage('Could not create folder.');
    }
  };

  const openFolder = (folder) => {
    setFolderPath([...folderPath, folder]);
    setCurrentFolder(folder._id);
  };

  const goToBreadcrumb = (index) => {
    if (index === -1) {
      setFolderPath([]);
      setCurrentFolder(null);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolder(newPath[newPath.length - 1]._id);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('Delete this folder? It must be empty.')) return;
    try {
      const res = await fetch(`${API_URL}/api/folders/${folderId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message);
        return;
      }
      fetchContents(currentFolder);
    } catch (err) {
      setMessage('Delete failed.');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      const urlRes = await fetch(`${API_URL}/api/upload/request-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          fileSize: file.size,
        }),
      });

      const urlData = await urlRes.json();

      if (!urlRes.ok) {
        setMessage(urlData.message || 'Upload rejected.');
        setUploading(false);
        return;
      }

      await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      await fetch(`${API_URL}/api/upload/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          s3Key: urlData.s3Key,
          mimeType: file.type,
          size: file.size,
          folder: currentFolder,
        }),
      });

      setMessage('File uploaded successfully!');
      fetchContents(currentFolder);
    } catch (err) {
      setMessage('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileId) => {
    const res = await fetch(`${API_URL}/api/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    window.open(data.downloadUrl, '_blank');
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await fetch(`${API_URL}/api/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchContents(currentFolder);
    } catch (err) {
      setMessage('Delete failed.');
    }
  };

  const handleShare = async (fileId) => {
    try {
      const res = await fetch(`${API_URL}/api/share/${fileId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        navigator.clipboard.writeText(data.shareUrl);
        setMessage(`Share link copied — expires ${new Date(data.expiresAt).toLocaleString()}`);
      } else {
        setMessage(data.message || 'Could not create share link.');
      }
    } catch (err) {
      setMessage('Share failed.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <div className="dash-shell">
      <div className="dash-header">
        <h2>My Files</h2>
        <button className="btn-chip" onClick={logout}>Log out</button>
      </div>

      <div className="breadcrumb">
        <button className="crumb" onClick={() => goToBreadcrumb(-1)}>Home</button>
        {folderPath.map((f, i) => (
          <span key={f._id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className="crumb-sep">/</span>
            <button className="crumb" onClick={() => goToBreadcrumb(i)}>{f.name}</button>
          </span>
        ))}
      </div>

      <div className="toolbar">
        <input
          type="text"
          placeholder="New folder name"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
        />
        <button className="btn-secondary" onClick={handleCreateFolder}>
          + Folder
        </button>
      </div>

      <div className="upload-zone">
        <input type="file" onChange={handleUpload} disabled={uploading} />
        {uploading && <span style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>Uploading…</span>}
      </div>

      {message && <p className="status-line">{message}</p>}

      <ul className="entry-list">
        {folders.map((folder) => (
          <li className="entry-row" key={folder._id}>
            <span className="entry-name folder" onClick={() => openFolder(folder)}>
              <span className="entry-icon gold">▸</span>
              {folder.name}
            </span>
            <div className="entry-actions">
              <button className="btn-chip danger" onClick={() => handleDeleteFolder(folder._id)}>
                Delete
              </button>
            </div>
          </li>
        ))}

        {files.map((file) => (
          <li className="entry-row" key={file._id}>
            <span className="entry-name">
              <span className="entry-icon">●</span>
              {file.filename}
              <span className="entry-meta">&nbsp;· {Math.round(file.size / 1024)} KB</span>
            </span>
            <div className="entry-actions">
              <button className="btn-chip" onClick={() => handleDownload(file._id)}>Download</button>
              <button className="btn-chip share" onClick={() => handleShare(file._id)}>Share</button>
              <button className="btn-chip danger" onClick={() => handleDelete(file._id)}>Delete</button>
            </div>
          </li>
        ))}

        {folders.length === 0 && files.length === 0 && (
          <li className="empty-state">This folder is empty. Upload a file or create a folder to get started.</li>
        )}
      </ul>
    </div>
  );
}

export default Dashboard;
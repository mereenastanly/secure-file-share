import { useState, useEffect } from 'react';

function Dashboard() {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null); // null = top level
  const [folderPath, setFolderPath] = useState([]); // for breadcrumb
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  const token = localStorage.getItem('token');

  const fetchContents = async (folderId) => {
    try {
      const url = folderId
        ? `http://localhost:5000/api/folders/contents?parentFolder=${folderId}`
        : `http://localhost:5000/api/folders/contents`;

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
      await fetch('http://localhost:5000/api/folders', {
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
      const res = await fetch(`http://localhost:5000/api/folders/${folderId}`, {
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
      const urlRes = await fetch('http://localhost:5000/api/upload/request-url', {
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

      await fetch('http://localhost:5000/api/upload/confirm', {
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
    const res = await fetch(`http://localhost:5000/api/files/${fileId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    window.open(data.downloadUrl, '_blank');
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await fetch(`http://localhost:5000/api/files/${fileId}`, {
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
    const res = await fetch(`http://localhost:5000/api/share/${fileId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (res.ok) {
      navigator.clipboard.writeText(data.shareUrl);
      setMessage(`Share link copied! Expires: ${new Date(data.expiresAt).toLocaleString()}`);
    } else {
      setMessage(data.message || 'Could not create share link.');
    }
  } catch (err) {
    setMessage('Share failed.');
  }
};

  return (
    <div style={{ maxWidth: '700px', margin: '3rem auto', fontFamily: 'sans-serif' }}>
      <h2>My Files</h2>

      {/* Breadcrumb */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => goToBreadcrumb(-1)} style={{ marginRight: '0.5rem' }}>
          Home
        </button>
        {folderPath.map((f, i) => (
          <span key={f._id}>
            {' / '}
            <button onClick={() => goToBreadcrumb(i)}>{f.name}</button>
          </span>
        ))}
      </div>

      {/* Create folder */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="New folder name"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
        />
        <button onClick={handleCreateFolder} style={{ marginLeft: '0.5rem' }}>
          Create Folder
        </button>
      </div>

      {/* Upload */}
      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
      {message && <p>{message}</p>}

      {/* Folder list */}
      <ul style={{ marginTop: '2rem', listStyle: 'none', padding: 0 }}>
        {folders.map((folder) => (
          <li
            key={folder._id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              borderBottom: '1px solid #ddd',
            }}
          >
            <span style={{ cursor: 'pointer' }} onClick={() => openFolder(folder)}>
              📁 {folder.name}
            </span>
            <button onClick={() => handleDeleteFolder(folder._id)}>Delete</button>
          </li>
        ))}

        {/* File list */}
        {files.map((file) => (
          <li
            key={file._id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              borderBottom: '1px solid #ddd',
            }}
          >
            <span>{file.filename} ({Math.round(file.size / 1024)} KB)</span>
            <div>
  <button onClick={() => handleDownload(file._id)}>Download</button>
  <button onClick={() => handleShare(file._id)} style={{ marginLeft: '0.5rem' }}>
    Share
  </button>
  <button onClick={() => handleDelete(file._id)} style={{ marginLeft: '0.5rem' }}>
    Delete
  </button>
</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
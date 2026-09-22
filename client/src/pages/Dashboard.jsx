import { useState, useEffect } from 'react';

function Dashboard() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');

  const fetchFiles = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/files', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      setMessage('Could not load files.');
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage('');

    try {
      // Step 1: ask backend for a pre-signed upload URL
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

      // Step 2: upload the actual file directly to S3
      await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      // Step 3: tell backend the upload succeeded, save metadata
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
        }),
      });

      setMessage('File uploaded successfully!');
      fetchFiles();
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

  return (
    <div style={{ maxWidth: '600px', margin: '3rem auto', fontFamily: 'sans-serif' }}>
      <h2>My Files</h2>

      <input type="file" onChange={handleUpload} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
      {message && <p>{message}</p>}

      <ul style={{ marginTop: '2rem', listStyle: 'none', padding: 0 }}>
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
            <button onClick={() => handleDownload(file._id)}>Download</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
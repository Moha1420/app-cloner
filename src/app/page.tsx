"use client";

import { useState, useEffect } from "react";
import { 
  Folder, File, ChevronDown, ChevronRight, Copy, Download,
  Loader, ExternalLink, CheckCircle
} from "lucide-react";

const GitHubExplorer = () => {
  const [repoUrl, setRepoUrl] = useState("");
  const [repo, setRepo] = useState(null);
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkMode(darkModeMediaQuery.matches);
    
    const handleChange = (e) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addEventListener("change", handleChange);
    
    return () => darkModeMediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Extract owner and repo name from GitHub URL
  const extractRepoInfo = (url) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    return match ? { owner: match[1], name: match[2].replace(".git", "") } : null;
  };

  // Fetch repository data
  const fetchRepo = async () => {
    if (!repoUrl.trim()) {
      setError("Please enter a GitHub repository URL");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setRepo(null);
    setFiles([]);
    setSelectedFile(null);
    setFileContent("");
    setCurrentPath("");
    
    try {
      const repoInfo = extractRepoInfo(repoUrl);
      if (!repoInfo) {
        throw new Error("Invalid GitHub repository URL");
      }
      
      const { owner, name } = repoInfo;
      
      // Fetch repository info
      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${name}`);
      if (!repoResponse.ok) {
        throw new Error(`Error: ${repoResponse.status} - ${await repoResponse.text()}`);
      }
      const repoData = await repoResponse.json();
      setRepo(repoData);
      
      // Fetch repository contents
      await fetchContents(owner, name);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch directory contents
  const fetchContents = async (owner, name, path = "") => {
    setIsLoading(true);
    try {
      const apiPath = path ? `/${path}` : "";
      const response = await fetch(`https://api.github.com/repos/${owner}/${name}/contents${apiPath}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${await response.text()}`);
      }
      
      const data = await response.json();
      setFiles(data);
      setCurrentPath(path);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to a folder
  const navigateToFolder = (file) => {
    if (!repo) return;
    
    const repoInfo = extractRepoInfo(repoUrl);
    if (!repoInfo) return;
    
    const { owner, name } = repoInfo;
    fetchContents(owner, name, file.path);
  };

  // Navigate up one level
  const navigateUp = () => {
    if (!currentPath || !repo) return;
    
    const pathParts = currentPath.split('/');
    pathParts.pop();
    const newPath = pathParts.join('/');
    
    const repoInfo = extractRepoInfo(repoUrl);
    if (!repoInfo) return;
    
    const { owner, name } = repoInfo;
    fetchContents(owner, name, newPath);
  };

  // Navigate to root
  const navigateToRoot = () => {
    if (!repo) return;
    
    const repoInfo = extractRepoInfo(repoUrl);
    if (!repoInfo) return;
    
    const { owner, name } = repoInfo;
    fetchContents(owner, name);
  };

  // Toggle folder expansion in file tree
  const toggleFolder = (path) => {
    setExpandedFolders(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path) 
        : [...prev, path]
    );
  };

  // View file content
  const viewFile = async (file) => {
    if (file.type !== "file" || !file.download_url) return;
    
    setSelectedFile(file);
    setIsFileLoading(true);
    
    try {
      const response = await fetch(file.download_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.status}`);
      }
      const content = await response.text();
      setFileContent(content);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFileLoading(false);
    }
  };

  // Copy file content
  const copyFileContent = () => {
    if (!fileContent) return;
    
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download file
  const downloadFile = (file) => {
    if (!file.download_url) return;
    
    window.open(file.download_url, "_blank");
  };

  // Format file size
  const formatSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Sort files (folders first, then alphabetically)
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === "dir" && b.type !== "dir") return -1;
    if (a.type !== "dir" && b.type === "dir") return 1;
    return a.name.localeCompare(b.name);
  });

  // Handle enter key in URL input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      fetchRepo();
    }
  };

  // Get path segments for breadcrumb
  const pathSegments = currentPath 
    ? [{ name: "Root", path: "" }, ...currentPath.split('/').map((segment, index, array) => ({
        name: segment,
        path: array.slice(0, index + 1).join('/')
      }))]
    : [{ name: "Root", path: "" }];

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-800"}`}>
      <div className="container mx-auto p-4">
        <h1 className={`text-3xl font-bold mb-6 text-center ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
          GitHub Repository Explorer
        </h1>
        
        {/* Repository URL Input */}
        <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow`}>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              className={`flex-grow p-2 rounded border ${
                isDarkMode 
                  ? "bg-gray-700 border-gray-600 text-white" 
                  : "bg-white border-gray-300"
              }`}
              placeholder="Enter GitHub repository URL (e.g. https://github.com/owner/repo)"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              onClick={fetchRepo}
              disabled={isLoading}
              className={`px-4 py-2 rounded font-medium ${
                isLoading
                  ? "bg-gray-400 cursor-not-allowed" 
                  : isDarkMode
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-500 hover:bg-blue-600"
              } text-white`}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader size={16} className="animate-spin mr-2" />
                  <span>Loading...</span>
                </div>
              ) : (
                "Explore Repository"
              )}
            </button>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className={`mb-6 p-4 rounded ${
            isDarkMode ? "bg-red-900/30 text-red-200" : "bg-red-100 text-red-700"
          }`}>
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        {/* Repository Info */}
        {repo && (
          <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow`}>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {repo.owner && repo.owner.avatar_url && (
                <img 
                  src={repo.owner.avatar_url} 
                  alt={repo.owner.login}
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <h2 className="text-xl font-bold">{repo.full_name}</h2>
                {repo.description && <p className="text-gray-500 dark:text-gray-400">{repo.description}</p>}
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {repo.language && <span>Language: {repo.language}</span>}
                  <span>Stars: {repo.stargazers_count.toLocaleString()}</span>
                  <span>Forks: {repo.forks_count.toLocaleString()}</span>
                </div>
              </div>
              <a 
                href={repo.html_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`ml-auto flex items-center gap-2 px-3 py-1 rounded ${
                  isDarkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                <ExternalLink size={16} />
                <span>View on GitHub</span>
              </a>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        {repo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* File Browser */}
            <div className={`rounded-lg shadow ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold">Repository Files</h2>
              </div>
              
              {/* Breadcrumb Navigation */}
              {currentPath && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center text-sm">
                  {pathSegments.map((segment, index) => (
                    <div key={segment.path} className="flex items-center">
                      {index > 0 && <span className="mx-1 text-gray-400">/</span>}
                      <button
                        onClick={() => {
                          const repoInfo = extractRepoInfo(repoUrl);
                          if (!repoInfo) return;
                          fetchContents(repoInfo.owner, repoInfo.name, segment.path);
                        }}
                        className={`hover:underline ${
                          currentPath === segment.path 
                            ? "font-semibold text-blue-500" 
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {segment.name}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* File List */}
              <div className="max-h-[calc(100vh-20rem)] overflow-auto p-1">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader size={24} className="animate-spin text-blue-500" />
                    <span className="ml-2">Loading files...</span>
                  </div>
                ) : sortedFiles.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    This folder is empty
                  </div>
                ) : (
                  <div>
                    {sortedFiles.map((file) => (
                      <div
                        key={file.path}
                        className={`p-2 rounded hover:${
                          isDarkMode ? "bg-gray-700" : "bg-gray-100"
                        } ${selectedFile?.path === file.path 
                          ? isDarkMode ? "bg-blue-900/30" : "bg-blue-50" 
                          : ""
                        }`}
                      >
                        {file.type === "dir" ? (
                          <button
                            onClick={() => navigateToFolder(file)}
                            className="flex items-center w-full text-left"
                          >
                            <Folder size={18} className="text-blue-400 mr-2" />
                            <span>{file.name}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => viewFile(file)}
                            className="flex items-center w-full text-left"
                          >
                            <File size={18} className="text-gray-400 mr-2" />
                            <span>{file.name}</span>
                            {file.size && (
                              <span className="ml-2 text-xs text-gray-500">
                                {formatSize(file.size)}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* File Viewer */}
            <div className="md:col-span-2">
              {selectedFile ? (
                <div className={`rounded-lg shadow ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center">
                      <File size={18} className="text-gray-400 mr-2" />
                      <h2 className="text-lg font-semibold">{selectedFile.name}</h2>
                      {selectedFile.size && (
                        <span className="ml-2 text-sm text-gray-500">
                          {formatSize(selectedFile.size)}
                        </span>
                      )}
                    </div>
                    
                    <div>
                      <button
                        onClick={copyFileContent}
                        className={`p-1 rounded ${
                          isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                        }`}
                        title="Copy content"
                      >
                        {copied ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
                      </button>
                      {selectedFile.download_url && (
                        <button
                          onClick={() => downloadFile(selectedFile)}
                          className={`p-1 ml-2 rounded ${
                            isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                          }`}
                          title="Download file"
                        >
                          <Download size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700 text-sm">
                    <div className="flex flex-wrap items-center">
                      <span className="text-gray-500">Path:</span>
                      <span className="ml-2 font-mono">{selectedFile.path}</span>
                    </div>
                  </div>
                  
                  <div className="p-4 max-h-[calc(100vh-20rem)] overflow-auto">
                    {isFileLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader size={24} className="animate-spin text-blue-500" />
                        <span className="ml-2">Loading file content...</span>
                      </div>
                    ) : (
                      <pre className={`whitespace-pre-wrap break-words p-4 rounded ${
                        isDarkMode ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-800"
                      }`}>
                        {fileContent}
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`rounded-lg shadow ${isDarkMode ? "bg-gray-800" : "bg-white"} p-8 text-center`}>
                  <File size={48} className={`mx-auto mb-4 ${isDarkMode ? "text-gray-600" : "text-gray-300"}`} />
                  <h3 className="text-lg font-medium mb-2">No file selected</h3>
                  <p className="text-gray-500">Select a file from the repository to view its contents</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubExplorer;
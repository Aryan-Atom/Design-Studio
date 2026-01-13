import React, { useState, useRef, useEffect } from 'react';
import { Square, Circle, Type, MousePointer2, Hand, Trash2, Copy, ZoomIn, ZoomOut, Download, Upload, MessageSquare, X, Send } from 'lucide-react';

const DesignStudio = () => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('select');
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [comments, setComments] = useState([]);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentPos, setNewCommentPos] = useState(null);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [commentText, setCommentText] = useState('');

  const selectedElement = elements.find(el => el.id === selectedId);

  useEffect(() => {
    drawCanvas();
  }, [elements, selectedId, zoom, pan, comments, activeCommentId]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    elements.forEach(el => {
      ctx.save();
      
      if (el.type === 'rectangle') {
        ctx.fillStyle = el.fill;
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = el.borderWidth || 2 / zoom;
        ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;
        
        // Draw rounded rectangle
        const radius = el.borderRadius || 0;
        if (radius > 0) {
          ctx.beginPath();
          ctx.moveTo(el.x + radius, el.y);
          ctx.lineTo(el.x + el.width - radius, el.y);
          ctx.quadraticCurveTo(el.x + el.width, el.y, el.x + el.width, el.y + radius);
          ctx.lineTo(el.x + el.width, el.y + el.height - radius);
          ctx.quadraticCurveTo(el.x + el.width, el.y + el.height, el.x + el.width - radius, el.y + el.height);
          ctx.lineTo(el.x + radius, el.y + el.height);
          ctx.quadraticCurveTo(el.x, el.y + el.height, el.x, el.y + el.height - radius);
          ctx.lineTo(el.x, el.y + radius);
          ctx.quadraticCurveTo(el.x, el.y, el.x + radius, el.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(el.x, el.y, el.width, el.height);
          ctx.strokeRect(el.x, el.y, el.width, el.height);
        }
        
        ctx.globalAlpha = 1;
      } else if (el.type === 'circle') {
        ctx.fillStyle = el.fill;
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = el.borderWidth || 2 / zoom;
        ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;
        ctx.beginPath();
        const radius = Math.sqrt(el.width * el.width + el.height * el.height) / 2;
        ctx.arc(el.x + el.width / 2, el.y + el.height / 2, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (el.type === 'text') {
        ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;
        ctx.fillStyle = el.fill;
        ctx.font = `${el.fontSize}px Arial`;
        ctx.fillText(el.text, el.x, el.y + el.fontSize);
        ctx.globalAlpha = 1;
      }

      if (el.id === selectedId) {
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.strokeRect(el.x - 5, el.y - 5, el.width + 10, el.height + 10);
        ctx.setLineDash([]);
      }
      
      ctx.restore();
    });

    // Draw comments
    comments.forEach(comment => {
      ctx.save();
      
      // Draw comment pin
      ctx.fillStyle = comment.id === activeCommentId ? '#2563eb' : '#6366f1';
      ctx.beginPath();
      ctx.arc(comment.x, comment.y, 8 / zoom, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw comment count badge
      if (comment.replies && comment.replies.length > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(comment.x + 6 / zoom, comment.y - 6 / zoom, 6 / zoom, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = `${10 / zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(comment.replies.length.toString(), comment.x + 6 / zoom, comment.y - 6 / zoom);
      }
      
      ctx.restore();
    });

    ctx.restore();
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);

    if (isAddingComment) {
      setNewCommentPos(pos);
      return;
    }

    // Check if clicking on a comment
    const clickedComment = comments.find(comment => {
      const dx = pos.x - comment.x;
      const dy = pos.y - comment.y;
      return Math.sqrt(dx * dx + dy * dy) < 12 / zoom;
    });

    if (clickedComment) {
      setActiveCommentId(clickedComment.id);
      return;
    }

    if (tool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (tool === 'select') {
      const clicked = [...elements].reverse().find(el => 
        pos.x >= el.x && pos.x <= el.x + el.width &&
        pos.y >= el.y && pos.y <= el.y + el.height
      );
      
      if (clicked) {
        setSelectedId(clicked.id);
        setIsDragging(true);
        setDragStart({ x: pos.x - clicked.x, y: pos.y - clicked.y });
      } else {
        setSelectedId(null);
      }
    } else if (['rectangle', 'circle'].includes(tool)) {
      setIsDrawing(true);
      setDrawStart(pos);
    } else if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const newEl = {
          id: Date.now(),
          type: 'text',
          x: pos.x,
          y: pos.y,
          width: text.length * 12,
          height: 20,
          text,
          name: 'Text',
          fontSize: 20,
          fill: '#000000',
          opacity: 1
        };
        setElements([...elements, newEl]);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    const pos = getMousePos(e);

    if (isDragging && selectedId) {
      setElements(elements.map(el => 
        el.id === selectedId
          ? { ...el, x: pos.x - dragStart.x, y: pos.y - dragStart.y }
          : el
      ));
    } else if (isDrawing) {
      const width = pos.x - drawStart.x;
      const height = pos.y - drawStart.y;
      
      const tempEl = {
        id: 'temp',
        type: tool,
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        width: Math.abs(width),
        height: Math.abs(height),
        name: tool.charAt(0).toUpperCase() + tool.slice(1),
        fill: '#e0e7ff',
        stroke: '#4f46e5',
        borderWidth: 2,
        borderRadius: 0,
        opacity: 1,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        flexAlign: 'flex-start',
        flexJustify: 'flex-start',
        flexGap: 0
      };
      
      setElements([...elements.filter(el => el.id !== 'temp'), tempEl]);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing) {
      setElements(elements.map(el => 
        el.id === 'temp' ? { ...el, id: Date.now() } : el
      ));
      setIsDrawing(false);
    }
    setIsDragging(false);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements(elements.filter(el => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  const duplicateSelected = () => {
    if (selectedId) {
      const el = elements.find(e => e.id === selectedId);
      const newEl = { ...el, id: Date.now(), x: el.x + 20, y: el.y + 20 };
      setElements([...elements, newEl]);
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 5));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.1));

  const exportDesign = () => {
    const data = JSON.stringify({ elements, comments }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design.json';
    a.click();
  };

  const importDesign = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          setElements(data.elements || data);
          setComments(data.comments || []);
        } catch (err) {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    }
  };

  const addComment = () => {
    if (!commentText.trim() || !newCommentPos) return;
    
    const newComment = {
      id: Date.now(),
      x: newCommentPos.x,
      y: newCommentPos.y,
      text: commentText,
      author: 'You',
      timestamp: new Date().toLocaleString(),
      replies: []
    };
    
    setComments([...comments, newComment]);
    setCommentText('');
    setNewCommentPos(null);
    setIsAddingComment(false);
    setActiveCommentId(newComment.id);
  };

  const addReply = (commentId, replyText) => {
    if (!replyText.trim()) return;
    
    setComments(comments.map(comment => 
      comment.id === commentId
        ? {
            ...comment,
            replies: [...comment.replies, {
              id: Date.now(),
              text: replyText,
              author: 'You',
              timestamp: new Date().toLocaleString()
            }]
          }
        : comment
    ));
  };

  const deleteComment = (commentId) => {
    setComments(comments.filter(c => c.id !== commentId));
    setActiveCommentId(null);
  };

  const resolveComment = (commentId) => {
    setComments(comments.map(c => 
      c.id === commentId ? { ...c, resolved: !c.resolved } : c
    ));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-800 mr-4">Design Studio</h1>
          
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTool('select')}
              className={`p-2 rounded ${tool === 'select' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Select (V)"
            >
              <MousePointer2 size={18} />
            </button>
            <button
              onClick={() => setTool('pan')}
              className={`p-2 rounded ${tool === 'pan' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Pan (H)"
            >
              <Hand size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onClick={() => {
              setIsAddingComment(!isAddingComment);
              setTool('select');
            }}
            className={`p-2 rounded ${isAddingComment ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            title="Add Comment (C)"
          >
            <MessageSquare size={18} />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTool('rectangle')}
              className={`p-2 rounded ${tool === 'rectangle' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Rectangle (R)"
            >
              <Square size={18} />
            </button>
            <button
              onClick={() => setTool('circle')}
              className={`p-2 rounded ${tool === 'circle' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Circle (C)"
            >
              <Circle size={18} />
            </button>
            <button
              onClick={() => setTool('text')}
              className={`p-2 rounded ${tool === 'text' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Text (T)"
            >
              <Type size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <div className="flex gap-1">
            <button
              onClick={duplicateSelected}
              disabled={!selectedId}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Duplicate (Ctrl+D)"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={deleteSelected}
              disabled={!selectedId}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Delete (Del)"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={handleZoomOut} className="p-2 rounded hover:bg-gray-200">
              <ZoomOut size={18} />
            </button>
            <span className="px-3 py-2 text-sm font-medium">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="p-2 rounded hover:bg-gray-200">
              <ZoomIn size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <label className="p-2 rounded hover:bg-gray-100 cursor-pointer" title="Import">
            <Upload size={18} />
            <input type="file" accept=".json" onChange={importDesign} className="hidden" />
          </label>
          <button onClick={exportDesign} className="p-2 rounded hover:bg-gray-100" title="Export">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Layers</h2>
          <div className="space-y-1">
            {elements.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No elements yet</p>
            ) : (
              elements.map(el => (
                <div
                  key={el.id}
                  onClick={() => setSelectedId(el.id)}
                  className={`px-3 py-2 rounded text-sm cursor-pointer flex items-center justify-between group ${
                    el.id === selectedId ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="flex-1 truncate">
                    {el.name || (el.type === 'text' ? `Text: ${el.text.substring(0, 20)}` : el.type.charAt(0).toUpperCase() + el.type.slice(1))}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newName = prompt('Enter new name:', el.name || el.type);
                      if (newName) {
                        setElements(elements.map(elem => 
                          elem.id === el.id ? { ...elem, name: newName } : elem
                        ));
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 hover:text-gray-700 px-1"
                  >
                    ✏️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden bg-gray-100 relative">
          <canvas
            ref={canvasRef}
            width={2000}
            height={2000}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="absolute inset-0 cursor-crosshair"
            style={{ cursor: isAddingComment ? 'crosshair' : tool === 'pan' ? 'grab' : isPanning ? 'grabbing' : 'crosshair' }}
          />
          
          {/* Comment Input Modal */}
          {newCommentPos && (
            <div 
              className="absolute bg-white rounded-lg shadow-lg p-4 w-80 z-10"
              style={{
                left: newCommentPos.x * zoom + pan.x + 20,
                top: newCommentPos.y * zoom + pan.y
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">New Comment</h3>
                <button 
                  onClick={() => {
                    setNewCommentPos(null);
                    setCommentText('');
                    setIsAddingComment(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
              <textarea
                autoFocus
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-2 border rounded text-sm resize-none"
                rows={3}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setNewCommentPos(null);
                    setCommentText('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={addComment}
                  disabled={!commentText.trim()}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Send size={14} />
                  Post
                </button>
              </div>
            </div>
          )}

          {/* Active Comment Thread */}
          {activeCommentId && (() => {
            const comment = comments.find(c => c.id === activeCommentId);
            if (!comment) return null;
            return (
              <div 
                className="absolute bg-white rounded-lg shadow-lg w-80 z-10"
                style={{
                  left: comment.x * zoom + pan.x + 20,
                  top: comment.y * zoom + pan.y
                }}
              >
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Comments</h3>
                  <button 
                    onClick={() => setActiveCommentId(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {/* Main comment */}
                  <div className="p-3 border-b">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
                        {comment.author[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{comment.author}</span>
                          <span className="text-xs text-gray-500">{comment.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.text}</p>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="p-3 pl-6 border-b bg-gray-50">
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-semibold">
                          {reply.author[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-xs">{reply.author}</span>
                            <span className="text-xs text-gray-500">{reply.timestamp}</span>
                          </div>
                          <p className="text-sm text-gray-700">{reply.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Reply input */}
                  <div className="p-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a reply..."
                        className="flex-1 px-3 py-2 text-sm border rounded"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            addReply(comment.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => resolveComment(comment.id)}
                        className={`flex-1 px-3 py-1.5 text-xs rounded ${
                          comment.resolved 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {comment.resolved ? '✓ Resolved' : 'Resolve'}
                      </button>
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Sidebar */}
        <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Properties</h2>
          {selectedElement ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Name</label>
                <input
                  type="text"
                  value={selectedElement.name || selectedElement.type}
                  onChange={(e) => setElements(elements.map(el => 
                    el.id === selectedId ? { ...el, name: e.target.value } : el
                  ))}
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-600 block mb-1">Type</label>
                <div className="text-sm font-medium capitalize">{selectedElement.type}</div>
              </div>

              {/* Position & Size */}
              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Position & Size</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.x)}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { ...el, x: parseInt(e.target.value) || 0 } : el
                      ))}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.y)}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { ...el, y: parseInt(e.target.value) || 0 } : el
                      ))}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Width</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.width)}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { ...el, width: parseInt(e.target.value) || 0 } : el
                      ))}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Height</label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.height)}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { ...el, height: parseInt(e.target.value) || 0 } : el
                      ))}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Appearance</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Fill Color</label>
                    <input
                      type="color"
                      value={selectedElement.fill}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { ...el, fill: e.target.value } : el
                      ))}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                  {selectedElement.stroke && (
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Stroke Color</label>
                      <input
                        type="color"
                        value={selectedElement.stroke}
                        onChange={(e) => setElements(elements.map(el => 
                          el.id === selectedId ? { ...el, stroke: e.target.value } : el
                        ))}
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Opacity</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={selectedElement.opacity !== undefined ? selectedElement.opacity : 1}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { ...el, opacity: parseFloat(e.target.value) } : el
                      ))}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center mt-1">
                      {Math.round((selectedElement.opacity !== undefined ? selectedElement.opacity : 1) * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Border */}
              {selectedElement.type !== 'text' && (
                <div className="border-t pt-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">Border</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Border Width</label>
                      <input
                        type="number"
                        min="0"
                        value={selectedElement.borderWidth || 2}
                        onChange={(e) => setElements(elements.map(el => 
                          el.id === selectedId ? { ...el, borderWidth: parseInt(e.target.value) || 0 } : el
                        ))}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Border Radius</label>
                      <input
                        type="number"
                        min="0"
                        value={selectedElement.borderRadius || 0}
                        onChange={(e) => setElements(elements.map(el => 
                          el.id === selectedId ? { ...el, borderRadius: parseInt(e.target.value) || 0 } : el
                        ))}
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Spacing */}
              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Spacing</h3>
                
                {/* Padding */}
                <div className="mb-3">
                  <label className="text-xs text-gray-600 block mb-1">Padding</label>
                  <div className="grid grid-cols-4 gap-1">
                    <input
                      type="number"
                      placeholder="T"
                      value={selectedElement.padding?.top || 0}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { 
                          ...el, 
                          padding: { ...el.padding, top: parseInt(e.target.value) || 0 } 
                        } : el
                      ))}
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="R"
                      value={selectedElement.padding?.right || 0}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { 
                          ...el, 
                          padding: { ...el.padding, right: parseInt(e.target.value) || 0 } 
                        } : el
                      ))}
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="B"
                      value={selectedElement.padding?.bottom || 0}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { 
                          ...el, 
                          padding: { ...el.padding, bottom: parseInt(e.target.value) || 0 } 
                        } : el
                      ))}
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="L"
                      value={selectedElement.padding?.left || 0}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { 
                          ...el, 
                          padding: { ...el.padding, left: parseInt(e.target.value) || 0 } 
                        } : el
                      ))}
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                  </div>
                </div>

                {/* Margin */}
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Margin</label>
                  <div className="grid grid-cols-4 gap-1">
                    <input
                      type="number"
                      placeholder="T"
                      value={selectedElement.margin?.top || 0}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { 
                          ...el, 
                          margin: { ...el.margin, top: parseInt(e.target.value) || 0 } 
                        } : el
                      ))}
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="R"
                      value={selectedElement.margin?.right || 0}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { 
                          ...el, 
                          margin: { ...el.margin, right: parseInt(e.target.value) || 0 } 
                        } : el
                      ))}
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="B"
                      value={selectedElement.margin?.bottom || 0}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { 
                          ...el, 
                          margin: { ...el.margin, bottom: parseInt(e.target.value) || 0 } 
                        } : el
                      ))}
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="L"
                      value={selectedElement.margin?.left || 0}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { 
                          ...el, 
                          margin: { ...el.margin, left: parseInt(e.target.value) || 0 } 
                        } : el
                      ))}
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Flexbox */}
              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Flexbox</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Align Items</label>
                    <select
                      value={selectedElement.flexAlign || 'flex-start'}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { ...el, flexAlign: e.target.value } : el
                      ))}
                      className="w-full px-2 py-1 text-sm border rounded"
                    >
                      <option value="flex-start">Start</option>
                      <option value="center">Center</option>
                      <option value="flex-end">End</option>
                      <option value="stretch">Stretch</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Justify Content</label>
                    <select
                      value={selectedElement.flexJustify || 'flex-start'}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { ...el, flexJustify: e.target.value } : el
                      ))}
                      className="w-full px-2 py-1 text-sm border rounded"
                    >
                      <option value="flex-start">Start</option>
                      <option value="center">Center</option>
                      <option value="flex-end">End</option>
                      <option value="space-between">Space Between</option>
                      <option value="space-around">Space Around</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">Gap</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedElement.flexGap || 0}
                      onChange={(e) => setElements(elements.map(el => 
                        el.id === selectedId ? { ...el, flexGap: parseInt(e.target.value) || 0 } : el
                      ))}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Select an element to edit properties</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignStudio;
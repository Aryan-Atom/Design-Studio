import React, { useState, useRef, useEffect } from "react";
import {
  Square,
  Circle,
  Type,
  MousePointer2,
  Hand,
  Trash2,
  Copy,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  MessageSquare,
  X,
  Send,
  Layers,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const DesignStudio = ({ initialData }) => {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("select");
  const [elements, setElements] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragInitialPositions, setDragInitialPositions] = useState({});
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
  const [commentText, setCommentText] = useState("");

  // Load initial elements/comments when provided (e.g., from a template)
  useEffect(() => {
    if (initialData && typeof initialData === "object") {
      if (Array.isArray(initialData.elements)) {
        setElements(initialData.elements);
      }
      if (Array.isArray(initialData.comments)) {
        setComments(initialData.comments);
      }
    }
  }, [initialData]);

  // Helpers for grouping & constraints
  const [lastClickedId, setLastClickedId] = useState(null);
  const [draggingAsGroupId, setDraggingAsGroupId] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const findElementById = (list, id, parent = null) => {
    for (let i = list.length - 1; i >= 0; i--) {
      const el = list[i];
      if (el.id === id) return { el, parent };
      if (el.type === "group" && Array.isArray(el.children)) {
        const res = findElementById(el.children, id, el);
        if (res) return res;
      }
    }
    return null;
  };

  const isInside = (pos, el) =>
    pos.x >= el.x &&
    pos.x <= el.x + el.width &&
    pos.y >= el.y &&
    pos.y <= el.y + el.height;

  const hitTest = (pos, list) => {
    // Return top-most element (deep child first)
    for (let i = list.length - 1; i >= 0; i--) {
      const el = list[i];
      if (el.locked) continue; // skip locked elements
      if (el.type === "group" && Array.isArray(el.children)) {
        const childPos = { x: pos.x - el.x, y: pos.y - el.y };
        const childHit = hitTest(childPos, el.children);
        if (childHit)
          return { ...childHit, offset: { x: el.x, y: el.y }, parent: el };
        if (isInside(pos, el)) return { el, parent: null };
      } else {
        if (isInside(pos, el)) return { el, parent: null };
      }
    }
    return null;
  };

  const selectedElement =
    selectedIds.length === 1
      ? findElementById(elements, selectedIds[0])?.el || null
      : null;

  useEffect(() => {
    drawCanvas();
  }, [elements, selectedIds, zoom, pan, comments, activeCommentId]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    const drawRoundedRect = (ctx, x, y, w, h, r) => {
      const radius = r || 0;
      if (radius <= 0) {
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        return;
      }
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const autoLayoutChildren = (parent) => {
      if (parent.layout !== "auto" || !Array.isArray(parent.children)) return;
      const dir = parent.layoutDir || "vertical";
      let cursorX = parent.padding?.left || 0;
      let cursorY = parent.padding?.top || 0;
      const gap = parent.flexGap || 0;
      const innerW =
        parent.width -
        (parent.padding?.left || 0) -
        (parent.padding?.right || 0);
      const innerH =
        parent.height -
        (parent.padding?.top || 0) -
        (parent.padding?.bottom || 0);

      parent.children.forEach((child) => {
        const m = child.margin || { top: 0, right: 0, bottom: 0, left: 0 };
        if (dir === "vertical") {
          child.x =
            (child.xAuto ?? m.left) +
            (parent.flexJustify === "center"
              ? Math.max(0, (innerW - child.width) / 2)
              : parent.flexJustify === "flex-end"
              ? Math.max(0, innerW - child.width)
              : 0) +
            (parent.padding?.left || 0);
          child.y = cursorY + m.top;
          cursorY += child.height + m.top + m.bottom + gap;
        } else {
          child.x = cursorX + m.left;
          child.y =
            (child.yAuto ?? m.top) +
            (parent.flexAlign === "center"
              ? Math.max(0, (innerH - child.height) / 2)
              : parent.flexAlign === "flex-end"
              ? Math.max(0, innerH - child.height)
              : 0) +
            (parent.padding?.top || 0);
          cursorX += child.width + m.left + m.right + gap;
        }
      });

      // Auto-resize parent based on children bounds
      const bounds = parent.children.reduce(
        (acc, c) => ({
          minX: Math.min(acc.minX, c.x - (parent.padding?.left || 0)),
          minY: Math.min(acc.minY, c.y - (parent.padding?.top || 0)),
          maxX: Math.max(
            acc.maxX,
            c.x + c.width + (parent.padding?.right || 0)
          ),
          maxY: Math.max(
            acc.maxY,
            c.y + c.height + (parent.padding?.bottom || 0)
          ),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      );
      if (isFinite(bounds.minX)) {
        parent.width = Math.max(1, bounds.maxX - bounds.minX);
        parent.height = Math.max(1, bounds.maxY - bounds.minY);
      }
    };

    const renderElement = (el, ctx) => {
      ctx.save();
      if (el.type === "group") {
        // Group: no white fill, only subtle border and a label
        ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;
        ctx.fillStyle = "transparent";
        ctx.strokeStyle = el.stroke || "#e5e7eb"; // light gray stroke
        ctx.lineWidth = el.borderWidth || 2 / zoom;
        // stroke rounded rect without visible fill
        drawRoundedRect(
          ctx,
          el.x,
          el.y,
          el.width,
          el.height,
          el.borderRadius || 8
        );
        ctx.globalAlpha = 1;

        // Layout children
        autoLayoutChildren(el);

        // Draw group name label on top-left
        ctx.fillStyle = "#9ca3af"; // light grey label
        ctx.font = `${12 / zoom}px Arial`;
        ctx.textBaseline = "top";
        ctx.fillText(el.name || "Group", el.x + 6, el.y + 6);

        // Draw children within this group's local space
        ctx.translate(el.x, el.y);
        (el.children || []).forEach((child) => renderElement(child, ctx));
      } else if (el.type === "rectangle") {
        ctx.fillStyle = el.fill;
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = el.borderWidth || 2 / zoom;
        ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;
        drawRoundedRect(
          ctx,
          el.x,
          el.y,
          el.width,
          el.height,
          el.borderRadius || 0
        );
        ctx.globalAlpha = 1;
      } else if (el.type === "circle") {
        ctx.fillStyle = el.fill;
        ctx.strokeStyle = el.stroke;
        ctx.lineWidth = el.borderWidth || 2 / zoom;
        ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;
        ctx.beginPath();
        const radius =
          Math.sqrt(el.width * el.width + el.height * el.height) / 2;
        ctx.arc(
          el.x + el.width / 2,
          el.y + el.height / 2,
          radius,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (el.type === "text") {
        ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;
        ctx.font = `${el.fontSize || 20}px Arial`;
        const metrics = ctx.measureText(el.text || "");
        const pad = el.padding || { top: 0, right: 0, bottom: 0, left: 0 };
        const textWidth = metrics.width;
        const textHeight = el.fontSize || 20;
        // Update width/height to include padding
        el.width = Math.max(
          el.width || 0,
          Math.ceil(textWidth) + (pad.left || 0) + (pad.right || 0)
        );
        el.height = Math.max(
          el.height || 0,
          Math.ceil(textHeight) + (pad.top || 0) + (pad.bottom || 0)
        );

        // Optional background if stroke defined
        if (el.stroke) {
          ctx.fillStyle = el.fill || "transparent";
          ctx.strokeStyle = el.stroke;
          ctx.lineWidth = el.borderWidth || 1 / zoom;
          drawRoundedRect(
            ctx,
            el.x,
            el.y,
            el.width,
            el.height,
            el.borderRadius || 0
          );
        }
        ctx.fillStyle = el.textColor || el.fill || "#000000";
        ctx.textBaseline = "top";
        ctx.fillText(el.text, el.x + (pad.left || 0), el.y + (pad.top || 0));
        ctx.globalAlpha = 1;
      }

      // Selection outline(s)
      if (selectedIds.includes(el.id)) {
        ctx.strokeStyle = "#0066ff";
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.strokeRect(el.x - 5, el.y - 5, el.width + 10, el.height + 10);
        ctx.setLineDash([]);
      }
      ctx.restore();
    };

    elements.forEach((el) => renderElement(el, ctx));

    // Draw comments
    comments.forEach((comment) => {
      ctx.save();

      // Draw comment pin
      ctx.fillStyle = comment.id === activeCommentId ? "#2563eb" : "#6366f1";
      ctx.beginPath();
      ctx.arc(comment.x, comment.y, 8 / zoom, 0, Math.PI * 2);
      ctx.fill();

      // Draw comment count badge
      if (comment.replies && comment.replies.length > 0) {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(
          comment.x + 6 / zoom,
          comment.y - 6 / zoom,
          6 / zoom,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = `${10 / zoom}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          comment.replies.length.toString(),
          comment.x + 6 / zoom,
          comment.y - 6 / zoom
        );
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
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);

    if (isAddingComment) {
      setNewCommentPos(pos);
      return;
    }

    // Check if clicking on a comment
    const clickedComment = comments.find((comment) => {
      const dx = pos.x - comment.x;
      const dy = pos.y - comment.y;
      return Math.sqrt(dx * dx + dy * dy) < 12 / zoom;
    });

    if (clickedComment) {
      setActiveCommentId(clickedComment.id);
      return;
    }

    if (tool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (tool === "select") {
      const hit = hitTest(pos, elements);
      if (hit && hit.el) {
        // Ignore locked targets (or locked parent group)
        if (hit.el.locked || (hit.parent && hit.parent.locked)) return;

        // If clicked inside a group child, drag the whole group
        if (hit.parent) {
          setSelectedIds([hit.parent.id]);
          setDraggingAsGroupId(hit.parent.id);
        }
        lastClickedId &&
          lastClickedId !== hit.el.id &&
          setLastClickedId(hit.el.id);
        if (e.ctrlKey || e.metaKey) {
          setSelectedIds((prev) =>
            prev.includes(hit.el.id)
              ? prev.filter((id) => id !== hit.el.id)
              : [...prev, hit.el.id]
          );
        } else {
          // If dragging by child, selection already set to parent above
          if (!hit.parent) setSelectedIds([hit.el.id]);
        }
        // Prepare drag of all selected
        const initial = {};
        selectedIds.includes(hit.el.id)
          ? selectedIds
          : [hit.el.id].forEach((id) => {
              const found = findElementById(elements, id);
              if (found?.el) {
                const el = found.el;
                // compute offset for mouse
                initial[id] = { startX: el.x, startY: el.y };
              }
            });
        setDragInitialPositions(initial);
        setIsDragging(true);
        setDragStart({ x: pos.x, y: pos.y });
      } else {
        setSelectedIds([]);
      }
    } else if (["rectangle", "circle"].includes(tool)) {
      setIsDrawing(true);
      setDrawStart(pos);
    } else if (tool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        const newEl = {
          id: Date.now(),
          type: "text",
          x: pos.x,
          y: pos.y,
          width: text.length * 12,
          height: 20,
          text,
          name: "Text",
          fontSize: 20,
          fill: "#ffffff",
          textColor: "rgb(0, 0, 0)",
          opacity: 1,
          padding: { top: 4, right: 6, bottom: 4, left: 6 },
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        };
        setElements([...elements, newEl]);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const pos = getMousePos(e);

    if (isDragging && selectedIds.length > 0) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      if (draggingAsGroupId) {
        // Move only the targeted group, children stay positioned relative
        const moveGroup = (list) =>
          list.map((el) => {
            if (el.id === draggingAsGroupId) {
              return {
                ...el,
                x: (dragInitialPositions[el.id]?.startX || el.x) + dx,
                y: (dragInitialPositions[el.id]?.startY || el.y) + dy,
              };
            }
            if (el.type === "group" && Array.isArray(el.children)) {
              return { ...el, children: moveGroup(el.children) };
            }
            return el;
          });
        setElements(moveGroup(elements));
      } else {
        const updatePositions = (list) =>
          list.map((el) => {
            if (selectedIds.includes(el.id)) {
              return {
                ...el,
                x: (dragInitialPositions[el.id]?.startX || el.x) + dx,
                y: (dragInitialPositions[el.id]?.startY || el.y) + dy,
              };
            }
            if (el.type === "group" && Array.isArray(el.children)) {
              return { ...el, children: updatePositions(el.children) };
            }
            return el;
          });
        setElements(updatePositions(elements));
      }
    } else if (isDrawing) {
      const width = pos.x - drawStart.x;
      const height = pos.y - drawStart.y;

      const tempEl = {
        id: "temp",
        type: tool,
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        width: Math.abs(width),
        height: Math.abs(height),
        name: tool.charAt(0).toUpperCase() + tool.slice(1),
        fill: "#e0e7ff",
        stroke: "#4f46e5",
        borderWidth: 2,
        borderRadius: 0,
        opacity: 1,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        flexAlign: "flex-start",
        flexJustify: "flex-start",
        flexGap: 0,
      };

      setElements([...elements.filter((el) => el.id !== "temp"), tempEl]);
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing) {
      setElements(
        elements.map((el) =>
          el.id === "temp" ? { ...el, id: Date.now() } : el
        )
      );
      setIsDrawing(false);
    }
    if (isDragging) {
      if (draggingAsGroupId) {
        // End group drag without relocation logic
        setDraggingAsGroupId(null);
        setIsDragging(false);
        return;
      }
      // If any dragged root element crosses into a group, add as child
      const relocateIntoGroup = (list) => {
        const res = [];
        list.forEach((el) => {
          if (selectedIds.includes(el.id)) {
            const center = { x: el.x + el.width / 2, y: el.y + el.height / 2 };
            const target = elements
              .slice()
              .reverse()
              .find((g) => g.type === "group" && isInside(center, g));
            if (target) {
              const localEl = {
                ...el,
                x: center.x - target.x - el.width / 2,
                y: center.y - target.y - el.height / 2,
              };
              if (!Array.isArray(target.children)) target.children = [];
              target.children = [...target.children, localEl];
              return; // Skip adding to root
            }
          }
          res.push(el);
        });
        return res;
      };

      // If any dragged child leaves its parent, move to root
      const moveChildOut = (list, parent = null) => {
        return list.reduce((acc, el) => {
          if (el.type === "group" && Array.isArray(el.children)) {
            const keptChildren = [];
            el.children.forEach((c) => {
              if (selectedIds.includes(c.id)) {
                const center = { x: c.x + c.width / 2, y: c.y + c.height / 2 };
                if (
                  !(
                    center.x >= 0 &&
                    center.x <= el.width &&
                    center.y >= 0 &&
                    center.y <= el.height
                  )
                ) {
                  // Move to root with absolute coords
                  acc.push({ ...c, x: c.x + el.x, y: c.y + el.y });
                  return; // skip keeping in children
                }
              }
              keptChildren.push(c);
            });
            acc.push({ ...el, children: keptChildren });
          } else {
            acc.push(el);
          }
          return acc;
        }, []);
      };

      setElements(moveChildOut(relocateIntoGroup(elements)));
    }
    setIsDragging(false);
  };

  // Z-index operations
  const reorderElement = (id, action) => {
    const found = findElementById(elements, id);
    if (!found || !found.el) return;
    const parent = found.parent;
    const within = parent ? parent.children : elements;
    const idx = within.findIndex((x) => x.id === id);
    if (idx === -1) return;
    let newArr = within.slice();
    if (action === "back") {
      const [item] = newArr.splice(idx, 1);
      newArr.unshift(item);
    } else if (action === "backward") {
      if (idx > 0) {
        const [item] = newArr.splice(idx, 1);
        newArr.splice(idx - 1, 0, item);
      }
    } else if (action === "forward") {
      if (idx < newArr.length - 1) {
        const [item] = newArr.splice(idx, 1);
        newArr.splice(idx + 1, 0, item);
      }
    } else if (action === "front") {
      const [item] = newArr.splice(idx, 1);
      newArr.push(item);
    }
    if (parent) {
      setElements(
        elements.map((el) =>
          el.id === parent.id ? { ...el, children: newArr } : el
        )
      );
    } else {
      setElements(newArr);
    }
  };

  const deleteSelected = () => {
    if (selectedIds.length > 0) {
      const removeByIds = (list) =>
        list.filter((el) => {
          if (selectedIds.includes(el.id)) return false;
          if (el.type === "group" && Array.isArray(el.children)) {
            el.children = removeByIds(el.children);
          }
          return true;
        });
      setElements(removeByIds(elements));
      setSelectedIds([]);
    }
  };

  const duplicateSelected = () => {
    if (selectedIds.length > 0) {
      const clones = [];
      const cloneList = (list) =>
        list.forEach((el) => {
          if (selectedIds.includes(el.id)) {
            const newEl = JSON.parse(JSON.stringify(el));
            newEl.id = Date.now() + Math.random();
            newEl.x = el.x + 20;
            newEl.y = el.y + 20;
            clones.push(newEl);
          }
          if (el.type === "group" && Array.isArray(el.children))
            cloneList(el.children);
        });
      cloneList(elements);
      setElements([...elements, ...clones]);
    }
  };

  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 5));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.1));

  // Grouping / Ungrouping
  const groupSelection = () => {
    if (selectedIds.length < 2) return;
    // Compute bounding box
    const flatSelected = [];
    const collect = (list) =>
      list.forEach((el) => {
        if (selectedIds.includes(el.id)) flatSelected.push(el);
        if (el.type === "group" && Array.isArray(el.children))
          collect(el.children);
      });
    collect(elements);
    if (flatSelected.length < 2) return;
    const minX = Math.min(...flatSelected.map((e) => e.x));
    const minY = Math.min(...flatSelected.map((e) => e.y));
    const maxX = Math.max(...flatSelected.map((e) => e.x + e.width));
    const maxY = Math.max(...flatSelected.map((e) => e.y + e.height));
    const group = {
      id: Date.now(),
      type: "group",
      name: "Group",
      x: minX - 20,
      y: minY - 20,
      width: maxX - minX + 40,
      height: maxY - minY + 40,
      fill: "#ffffff",
      stroke: "#cbd5e1",
      borderWidth: 2,
      borderRadius: 8,
      opacity: 1,
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      flexAlign: "flex-start",
      flexJustify: "flex-start",
      flexGap: 8,
      layout: "absolute",
      layoutDir: "vertical",
      children: [],
    };
    const rest = [];
    elements.forEach((el) => {
      if (selectedIds.includes(el.id)) {
        group.children.push({ ...el, x: el.x - group.x, y: el.y - group.y });
      } else {
        rest.push(el);
      }
    });
    setElements([...rest, group]);
    setSelectedIds([group.id]);
  };

  const ungroupSelection = () => {
    if (selectedIds.length !== 1) return;
    const found = findElementById(elements, selectedIds[0]);
    if (!found?.el || found.el.type !== "group") return;
    const group = found.el;
    const childrenAbs = (group.children || []).map((c) => ({
      ...c,
      x: c.x + group.x,
      y: c.y + group.y,
    }));
    const root = elements.filter((el) => el.id !== group.id);
    setElements([...root, ...childrenAbs]);
    setSelectedIds(childrenAbs.map((c) => c.id));
  };

  // Alignment tools
  const alignSelected = (type) => {
    if (selectedIds.length < 2) return;
    const selectedEls = [];
    const collect = (list) =>
      list.forEach((el) => {
        if (selectedIds.includes(el.id)) selectedEls.push(el);
        if (el.type === "group" && Array.isArray(el.children))
          collect(el.children);
      });
    collect(elements);
    const minX = Math.min(...selectedEls.map((e) => e.x));
    const maxX = Math.max(...selectedEls.map((e) => e.x + e.width));
    const minY = Math.min(...selectedEls.map((e) => e.y));
    const maxY = Math.max(...selectedEls.map((e) => e.y + e.height));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const updated = (list) =>
      list.map((el) => {
        if (selectedIds.includes(el.id)) {
          if (type === "left") return { ...el, x: minX };
          if (type === "right") return { ...el, x: maxX - el.width };
          if (type === "top") return { ...el, y: minY };
          if (type === "bottom") return { ...el, y: maxY - el.height };
          if (type === "hcenter")
            return { ...el, x: Math.round(centerX - el.width / 2) };
          if (type === "vcenter")
            return { ...el, y: Math.round(centerY - el.height / 2) };
        }
        if (el.type === "group" && Array.isArray(el.children))
          return { ...el, children: updated(el.children) };
        return el;
      });
    setElements(updated(elements));
  };

  const distributeSelected = (dir) => {
    if (selectedIds.length < 3) return;
    const selectedEls = [];
    const collect = (list) =>
      list.forEach((el) => {
        if (selectedIds.includes(el.id)) selectedEls.push(el);
        if (el.type === "group" && Array.isArray(el.children))
          collect(el.children);
      });
    collect(elements);
    if (dir === "horizontal") {
      const sorted = selectedEls.slice().sort((a, b) => a.x - b.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalWidth = sorted.reduce((acc, e) => acc + e.width, 0);
      const space =
        (last.x + last.width - first.x - totalWidth) / (sorted.length - 1);
      let cursor = first.x + first.width;
      const positions = {};
      for (let i = 1; i < sorted.length - 1; i++) {
        positions[sorted[i].id] = cursor + space;
        cursor = positions[sorted[i].id] + sorted[i].width;
      }
      const updated = (list) =>
        list.map((el) => {
          if (positions[el.id] !== undefined)
            return { ...el, x: Math.round(positions[el.id]) };
          if (el.type === "group" && Array.isArray(el.children))
            return { ...el, children: updated(el.children) };
          return el;
        });
      setElements(updated(elements));
    } else {
      const sorted = selectedEls.slice().sort((a, b) => a.y - b.y);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const totalHeight = sorted.reduce((acc, e) => acc + e.height, 0);
      const space =
        (last.y + last.height - first.y - totalHeight) / (sorted.length - 1);
      let cursor = first.y + first.height;
      const positions = {};
      for (let i = 1; i < sorted.length - 1; i++) {
        positions[sorted[i].id] = cursor + space;
        cursor = positions[sorted[i].id] + sorted[i].height;
      }
      const updated = (list) =>
        list.map((el) => {
          if (positions[el.id] !== undefined)
            return { ...el, y: Math.round(positions[el.id]) };
          if (el.type === "group" && Array.isArray(el.children))
            return { ...el, children: updated(el.children) };
          return el;
        });
      setElements(updated(elements));
    }
  };

  const exportDesign = () => {
    const data = JSON.stringify({ elements, comments }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "design.json";
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
          alert("Invalid file format");
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
      author: "You",
      timestamp: new Date().toLocaleString(),
      replies: [],
    };

    setComments([...comments, newComment]);
    setCommentText("");
    setNewCommentPos(null);
    setIsAddingComment(false);
    setActiveCommentId(newComment.id);
  };

  const addReply = (commentId, replyText) => {
    if (!replyText.trim()) return;

    setComments(
      comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              replies: [
                ...comment.replies,
                {
                  id: Date.now(),
                  text: replyText,
                  author: "You",
                  timestamp: new Date().toLocaleString(),
                },
              ],
            }
          : comment
      )
    );
  };

  const deleteComment = (commentId) => {
    setComments(comments.filter((c) => c.id !== commentId));
    setActiveCommentId(null);
  };

  const resolveComment = (commentId) => {
    setComments(
      comments.map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved } : c
      )
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-800 mr-4">
            Design Studio
          </h1>

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTool("select")}
              className={`p-2 rounded ${
                tool === "select" ? "bg-white shadow-sm" : "hover:bg-gray-200"
              }`}
              title="Select (V)"
            >
              <MousePointer2 size={18} />
            </button>
            <button
              onClick={() => setTool("pan")}
              className={`p-2 rounded ${
                tool === "pan" ? "bg-white shadow-sm" : "hover:bg-gray-200"
              }`}
              title="Pan (H)"
            >
              <Hand size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Grouping */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={groupSelection}
              disabled={selectedIds.length < 2}
              className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40 flex items-center gap-1"
              title="Group"
            >
              <Layers size={16} />
              <span className="text-xs">Group</span>
            </button>
            <button
              onClick={ungroupSelection}
              disabled={selectedIds.length !== 1}
              className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40"
              title="Ungroup"
            >
              <span className="text-xs">Ungroup</span>
            </button>
          </div>

          {/* Z-Index Controls */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 ml-2">
            <button
              onClick={() => reorderElement(selectedIds[0], "back")}
              disabled={selectedIds.length !== 1}
              className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40"
              title="Send to Back"
            >
              <span className="text-xs">Back</span>
            </button>
            <button
              onClick={() => reorderElement(selectedIds[0], "backward")}
              disabled={selectedIds.length !== 1}
              className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40"
              title="Send Backward"
            >
              <span className="text-xs">Backward</span>
            </button>
            <button
              onClick={() => reorderElement(selectedIds[0], "forward")}
              disabled={selectedIds.length !== 1}
              className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40"
              title="Send Forward"
            >
              <span className="text-xs">Forward</span>
            </button>
            <button
              onClick={() => reorderElement(selectedIds[0], "front")}
              disabled={selectedIds.length !== 1}
              className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-40"
              title="Bring to Front"
            >
              <span className="text-xs">Front</span>
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <button
            onClick={() => {
              setIsAddingComment(!isAddingComment);
              setTool("select");
            }}
            className={`p-2 rounded ${
              isAddingComment
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-100"
            }`}
            title="Add Comment (C)"
          >
            <MessageSquare size={18} />
          </button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTool("rectangle")}
              className={`p-2 rounded ${
                tool === "rectangle"
                  ? "bg-white shadow-sm"
                  : "hover:bg-gray-200"
              }`}
              title="Rectangle (R)"
            >
              <Square size={18} />
            </button>
            <button
              onClick={() => setTool("circle")}
              className={`p-2 rounded ${
                tool === "circle" ? "bg-white shadow-sm" : "hover:bg-gray-200"
              }`}
              title="Circle (C)"
            >
              <Circle size={18} />
            </button>
            <button
              onClick={() => setTool("text")}
              className={`p-2 rounded ${
                tool === "text" ? "bg-white shadow-sm" : "hover:bg-gray-200"
              }`}
              title="Text (T)"
            >
              <Type size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <div className="flex gap-1">
            <button
              onClick={duplicateSelected}
              disabled={selectedIds.length === 0}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Duplicate (Ctrl+D)"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={deleteSelected}
              disabled={selectedIds.length === 0}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Delete (Del)"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Alignment Tools */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              className="px-2 py-1 rounded hover:bg-gray-200 text-xs"
              title="Align Left"
              onClick={() => alignSelected("left")}
            >
              L
            </button>
            <button
              className="px-2 py-1 rounded hover:bg-gray-200 text-xs"
              title="Align H Center"
              onClick={() => alignSelected("hcenter")}
            >
              HC
            </button>
            <button
              className="px-2 py-1 rounded hover:bg-gray-200 text-xs"
              title="Align Right"
              onClick={() => alignSelected("right")}
            >
              R
            </button>
            <button
              className="px-2 py-1 rounded hover:bg-gray-200 text-xs"
              title="Align Top"
              onClick={() => alignSelected("top")}
            >
              T
            </button>
            <button
              className="px-2 py-1 rounded hover:bg-gray-200 text-xs"
              title="Align V Center"
              onClick={() => alignSelected("vcenter")}
            >
              VC
            </button>
            <button
              className="px-2 py-1 rounded hover:bg-gray-200 text-xs"
              title="Align Bottom"
              onClick={() => alignSelected("bottom")}
            >
              B
            </button>
            <button
              className="px-2 py-1 rounded hover:bg-gray-200 text-xs"
              title="Distribute Horizontally"
              onClick={() => distributeSelected("horizontal")}
            >
              DH
            </button>
            <button
              className="px-2 py-1 rounded hover:bg-gray-200 text-xs"
              title="Distribute Vertically"
              onClick={() => distributeSelected("vertical")}
            >
              DV
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded hover:bg-gray-200"
            >
              <ZoomOut size={18} />
            </button>
            <span className="px-3 py-2 text-sm font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded hover:bg-gray-200"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          <label
            className="p-2 rounded hover:bg-gray-100 cursor-pointer"
            title="Import"
          >
            <Upload size={18} />
            <input
              type="file"
              accept=".json"
              onChange={importDesign}
              className="hidden"
            />
          </label>
          <button
            onClick={exportDesign}
            className="p-2 rounded hover:bg-gray-100"
            title="Export"
          >
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
              elements.map((el) => (
                <div key={el.id}>
                  <div
                    onClick={(e) => {
                      if (el.locked) return;
                      if (e.ctrlKey || e.metaKey) {
                        setSelectedIds((prev) =>
                          prev.includes(el.id)
                            ? prev.filter((id) => id !== el.id)
                            : [...prev, el.id]
                        );
                      } else {
                        setSelectedIds([el.id]);
                      }
                    }}
                    className={`px-3 py-2 rounded text-sm cursor-pointer flex items-center justify-between group ${
                      selectedIds.includes(el.id)
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 truncate">
                      {el.type === "group" && (
                        <button
                          className="text-gray-500 hover:text-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCollapsedGroups((prev) => ({
                              ...prev,
                              [el.id]: !prev[el.id],
                            }));
                          }}
                          title={collapsedGroups[el.id] ? "Expand" : "Collapse"}
                        >
                          {collapsedGroups[el.id] ? (
                            <ChevronRight size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                      )}
                      <span className="flex-1 truncate">
                        {el.name ||
                          (el.type === "text"
                            ? `Text: ${(el.text || "").substring(0, 20)}`
                            : el.type.charAt(0).toUpperCase() +
                              el.type.slice(1))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setElements(
                            elements.map((elem) =>
                              elem.id === el.id
                                ? { ...elem, locked: !elem.locked }
                                : elem
                            )
                          );
                        }}
                        className="text-gray-500 hover:text-gray-700 px-1"
                        title={el.locked ? "Unlock" : "Lock"}
                      >
                        {el.locked ? <Unlock size={14} /> : <Lock size={14} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newName = prompt(
                            "Enter new name:",
                            el.name || el.type
                          );
                          if (newName) {
                            setElements(
                              elements.map((elem) =>
                                elem.id === el.id
                                  ? { ...elem, name: newName }
                                  : elem
                              )
                            );
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 hover:text-gray-700 px-1"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                  {el.type === "group" &&
                    Array.isArray(el.children) &&
                    !collapsedGroups[el.id] &&
                    el.children.map((child) => (
                      <div
                        key={child.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (child.locked || el.locked) return;
                          if (e.ctrlKey || e.metaKey) {
                            setSelectedIds((prev) =>
                              prev.includes(child.id)
                                ? prev.filter((id) => id !== child.id)
                                : [...prev, child.id]
                            );
                          } else {
                            setSelectedIds([child.id]);
                          }
                        }}
                        className={`ml-4 px-3 py-1 rounded text-xs cursor-pointer flex items-center justify-between group ${
                          selectedIds.includes(child.id)
                            ? "bg-blue-50 text-blue-700"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex-1 truncate">
                          {child.name ||
                            (child.type === "text"
                              ? `Text: ${(child.text || "").substring(0, 20)}`
                              : child.type.charAt(0).toUpperCase() +
                                child.type.slice(1))}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setElements(
                              elements.map((elem) => {
                                if (elem.id === el.id) {
                                  return {
                                    ...elem,
                                    children: elem.children.map((c) =>
                                      c.id === child.id
                                        ? { ...c, locked: !c.locked }
                                        : c
                                    ),
                                  };
                                }
                                return elem;
                              })
                            );
                          }}
                          className="text-gray-500 hover:text-gray-700 px-1"
                          title={child.locked ? "Unlock" : "Lock"}
                        >
                          {child.locked ? (
                            <Unlock size={12} />
                          ) : (
                            <Lock size={12} />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = prompt(
                              "Enter new name:",
                              child.name || child.type
                            );
                            if (newName) {
                              setElements(
                                elements.map((elem) => {
                                  if (elem.id === el.id) {
                                    return {
                                      ...elem,
                                      children: elem.children.map((c) =>
                                        c.id === child.id
                                          ? { ...c, name: newName }
                                          : c
                                      ),
                                    };
                                  }
                                  return elem;
                                })
                              );
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 text-xs text-gray-500 hover:text-gray-700 px-1"
                        >
                          ✏️
                        </button>
                      </div>
                    ))}
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
            style={{
              cursor: isAddingComment
                ? "crosshair"
                : tool === "pan"
                ? "grab"
                : isPanning
                ? "grabbing"
                : "crosshair",
            }}
          />

          {/* Comment Input Modal */}
          {newCommentPos && (
            <div
              className="absolute bg-white rounded-lg shadow-lg p-4 w-80 z-10"
              style={{
                left: newCommentPos.x * zoom + pan.x + 20,
                top: newCommentPos.y * zoom + pan.y,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">New Comment</h3>
                <button
                  onClick={() => {
                    setNewCommentPos(null);
                    setCommentText("");
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
                    setCommentText("");
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
          {activeCommentId &&
            (() => {
              const comment = comments.find((c) => c.id === activeCommentId);
              if (!comment) return null;
              return (
                <div
                  className="absolute bg-white rounded-lg shadow-lg w-80 z-10"
                  style={{
                    left: comment.x * zoom + pan.x + 20,
                    top: comment.y * zoom + pan.y,
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
                            <span className="font-semibold text-sm">
                              {comment.author}
                            </span>
                            <span className="text-xs text-gray-500">
                              {comment.timestamp}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="p-3 pl-6 border-b bg-gray-50"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-semibold">
                            {reply.author[0]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-xs">
                                {reply.author}
                              </span>
                              <span className="text-xs text-gray-500">
                                {reply.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">
                              {reply.text}
                            </p>
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
                            if (e.key === "Enter" && e.target.value.trim()) {
                              addReply(comment.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => resolveComment(comment.id)}
                          className={`flex-1 px-3 py-1.5 text-xs rounded ${
                            comment.resolved
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {comment.resolved ? "✓ Resolved" : "Resolve"}
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
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Properties
          </h2>
          {selectedElement ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Locked
                </label>
                <input
                  type="checkbox"
                  checked={!!selectedElement.locked}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    // update whether root or child
                    const found = findElementById(elements, selectedIds[0]);
                    if (!found) return;
                    if (!found.parent) {
                      setElements(
                        elements.map((el) =>
                          el.id === selectedIds[0]
                            ? { ...el, locked: checked }
                            : el
                        )
                      );
                    } else {
                      setElements(
                        elements.map((el) =>
                          el.id === found.parent.id
                            ? {
                                ...el,
                                children: el.children.map((c) =>
                                  c.id === selectedIds[0]
                                    ? { ...c, locked: checked }
                                    : c
                                ),
                              }
                            : el
                        )
                      );
                    }
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Name</label>
                <input
                  type="text"
                  value={selectedElement.name || selectedElement.type}
                  onChange={(e) =>
                    setElements(
                      elements.map((el) =>
                        el.id === selectedIds[0]
                          ? { ...el, name: e.target.value }
                          : el
                      )
                    )
                  }
                  className="w-full px-2 py-1 text-sm border rounded"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Type</label>
                <div className="text-sm font-medium capitalize">
                  {selectedElement.type}
                </div>
              </div>

              {/* Position & Size */}
              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">
                  Position & Size
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      X
                    </label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.x)}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? { ...el, x: parseInt(e.target.value) || 0 }
                              : el
                          )
                        )
                      }
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Y
                    </label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.y)}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? { ...el, y: parseInt(e.target.value) || 0 }
                              : el
                          )
                        )
                      }
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Width
                    </label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.width)}
                      onChange={(e) => {
                        const newW = parseInt(e.target.value) || 0;
                        setElements(
                          elements.map((el) => {
                            if (el.id === selectedIds[0]) {
                              if (
                                el.type === "group" &&
                                Array.isArray(el.children)
                              ) {
                                const deltaW = newW - el.width;
                                const children = el.children.map((c) => {
                                  const cons = c.constraints || {
                                    left: true,
                                    top: true,
                                  };
                                  let nx = c.x;
                                  let nw = c.width;
                                  if (cons.left && cons.right) {
                                    nw = Math.max(1, nw + deltaW);
                                  } else if (cons.right && !cons.left) {
                                    nx = nx + deltaW;
                                  }
                                  return { ...c, x: nx, width: nw };
                                });
                                return { ...el, width: newW, children };
                              }
                              return { ...el, width: newW };
                            }
                            return el;
                          })
                        );
                      }}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Height
                    </label>
                    <input
                      type="number"
                      value={Math.round(selectedElement.height)}
                      onChange={(e) => {
                        const newH = parseInt(e.target.value) || 0;
                        setElements(
                          elements.map((el) => {
                            if (el.id === selectedIds[0]) {
                              if (
                                el.type === "group" &&
                                Array.isArray(el.children)
                              ) {
                                const deltaH = newH - el.height;
                                const children = el.children.map((c) => {
                                  const cons = c.constraints || {
                                    left: true,
                                    top: true,
                                  };
                                  let ny = c.y;
                                  let nh = c.height;
                                  if (cons.top && cons.bottom) {
                                    nh = Math.max(1, nh + deltaH);
                                  } else if (cons.bottom && !cons.top) {
                                    ny = ny + deltaH;
                                  }
                                  return { ...c, y: ny, height: nh };
                                });
                                return { ...el, height: newH, children };
                              }
                              return { ...el, height: newH };
                            }
                            return el;
                          })
                        );
                      }}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">
                  Appearance
                </h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Fill Color
                    </label>
                    <input
                      type="color"
                      value={selectedElement.fill}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? { ...el, fill: e.target.value }
                              : el
                          )
                        )
                      }
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                  {selectedElement.stroke && (
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">
                        Stroke Color
                      </label>
                      <input
                        type="color"
                        value={selectedElement.stroke}
                        onChange={(e) =>
                          setElements(
                            elements.map((el) =>
                              el.id === selectedIds[0]
                                ? { ...el, stroke: e.target.value }
                                : el
                            )
                          )
                        }
                        className="w-full h-8 rounded cursor-pointer"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Opacity
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={
                        selectedElement.opacity !== undefined
                          ? selectedElement.opacity
                          : 1
                      }
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? { ...el, opacity: parseFloat(e.target.value) }
                              : el
                          )
                        )
                      }
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center mt-1">
                      {Math.round(
                        (selectedElement.opacity !== undefined
                          ? selectedElement.opacity
                          : 1) * 100
                      )}
                      %
                    </div>
                  </div>
                </div>
              </div>

              {/* Border */}
              {selectedElement.type !== "text" && (
                <div className="border-t pt-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">
                    Border
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">
                        Border Width
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={selectedElement.borderWidth || 2}
                        onChange={(e) =>
                          setElements(
                            elements.map((el) =>
                              el.id === selectedIds[0]
                                ? {
                                    ...el,
                                    borderWidth: parseInt(e.target.value) || 0,
                                  }
                                : el
                            )
                          )
                        }
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">
                        Border Radius
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={selectedElement.borderRadius || 0}
                        onChange={(e) =>
                          setElements(
                            elements.map((el) =>
                              el.id === selectedIds[0]
                                ? {
                                    ...el,
                                    borderRadius: parseInt(e.target.value) || 0,
                                  }
                                : el
                            )
                          )
                        }
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Spacing */}
              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">
                  Spacing
                </h3>

                {/* Padding */}
                <div className="mb-3">
                  <label className="text-xs text-gray-600 block mb-1">
                    Padding
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    <input
                      type="number"
                      placeholder="T"
                      value={selectedElement.padding?.top || 0}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? {
                                  ...el,
                                  padding: {
                                    ...el.padding,
                                    top: parseInt(e.target.value) || 0,
                                  },
                                }
                              : el
                          )
                        )
                      }
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="R"
                      value={selectedElement.padding?.right || 0}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? {
                                  ...el,
                                  padding: {
                                    ...el.padding,
                                    right: parseInt(e.target.value) || 0,
                                  },
                                }
                              : el
                          )
                        )
                      }
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="B"
                      value={selectedElement.padding?.bottom || 0}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? {
                                  ...el,
                                  padding: {
                                    ...el.padding,
                                    bottom: parseInt(e.target.value) || 0,
                                  },
                                }
                              : el
                          )
                        )
                      }
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="L"
                      value={selectedElement.padding?.left || 0}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? {
                                  ...el,
                                  padding: {
                                    ...el.padding,
                                    left: parseInt(e.target.value) || 0,
                                  },
                                }
                              : el
                          )
                        )
                      }
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                  </div>
                </div>

                {/* Margin */}
                <div>
                  <label className="text-xs text-gray-600 block mb-1">
                    Margin
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    <input
                      type="number"
                      placeholder="T"
                      value={selectedElement.margin?.top || 0}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? {
                                  ...el,
                                  margin: {
                                    ...el.margin,
                                    top: parseInt(e.target.value) || 0,
                                  },
                                }
                              : el
                          )
                        )
                      }
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="R"
                      value={selectedElement.margin?.right || 0}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? {
                                  ...el,
                                  margin: {
                                    ...el.margin,
                                    right: parseInt(e.target.value) || 0,
                                  },
                                }
                              : el
                          )
                        )
                      }
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="B"
                      value={selectedElement.margin?.bottom || 0}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? {
                                  ...el,
                                  margin: {
                                    ...el.margin,
                                    bottom: parseInt(e.target.value) || 0,
                                  },
                                }
                              : el
                          )
                        )
                      }
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                    <input
                      type="number"
                      placeholder="L"
                      value={selectedElement.margin?.left || 0}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? {
                                  ...el,
                                  margin: {
                                    ...el.margin,
                                    left: parseInt(e.target.value) || 0,
                                  },
                                }
                              : el
                          )
                        )
                      }
                      className="w-full px-1 py-1 text-xs border rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Flexbox */}
              <div className="border-t pt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">
                  Flexbox
                </h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Align Items
                    </label>
                    <select
                      value={selectedElement.flexAlign || "flex-start"}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? { ...el, flexAlign: e.target.value }
                              : el
                          )
                        )
                      }
                      className="w-full px-2 py-1 text-sm border rounded"
                    >
                      <option value="flex-start">Start</option>
                      <option value="center">Center</option>
                      <option value="flex-end">End</option>
                      <option value="stretch">Stretch</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 block mb-1">
                      Justify Content
                    </label>
                    <select
                      value={selectedElement.flexJustify || "flex-start"}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? { ...el, flexJustify: e.target.value }
                              : el
                          )
                        )
                      }
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
                    <label className="text-xs text-gray-600 block mb-1">
                      Gap
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={selectedElement.flexGap || 0}
                      onChange={(e) =>
                        setElements(
                          elements.map((el) =>
                            el.id === selectedIds[0]
                              ? {
                                  ...el,
                                  flexGap: parseInt(e.target.value) || 0,
                                }
                              : el
                          )
                        )
                      }
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  {selectedElement.type === "group" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">
                          Layout
                        </label>
                        <select
                          value={selectedElement.layout || "absolute"}
                          onChange={(e) =>
                            setElements(
                              elements.map((el) =>
                                el.id === selectedIds[0]
                                  ? { ...el, layout: e.target.value }
                                  : el
                              )
                            )
                          }
                          className="w-full px-2 py-1 text-sm border rounded"
                        >
                          <option value="absolute">Absolute</option>
                          <option value="auto">Auto Layout</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 block mb-1">
                          Direction
                        </label>
                        <select
                          value={selectedElement.layoutDir || "vertical"}
                          onChange={(e) =>
                            setElements(
                              elements.map((el) =>
                                el.id === selectedIds[0]
                                  ? { ...el, layoutDir: e.target.value }
                                  : el
                              )
                            )
                          }
                          disabled={
                            (selectedElement.layout || "absolute") !== "auto"
                          }
                          className="w-full px-2 py-1 text-sm border rounded"
                        >
                          <option value="vertical">Vertical</option>
                          <option value="horizontal">Horizontal</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Constraints for children */}
              {selectedElement && selectedElement.type !== "group" && (
                <div className="border-t pt-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">
                    Constraints
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedElement.constraints?.left || false}
                        onChange={(e) =>
                          setElements(
                            elements.map((el) =>
                              el.id === selectedIds[0]
                                ? {
                                    ...el,
                                    constraints: {
                                      ...el.constraints,
                                      left: e.target.checked,
                                    },
                                  }
                                : el
                            )
                          )
                        }
                      />{" "}
                      Left
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedElement.constraints?.right || false}
                        onChange={(e) =>
                          setElements(
                            elements.map((el) =>
                              el.id === selectedIds[0]
                                ? {
                                    ...el,
                                    constraints: {
                                      ...el.constraints,
                                      right: e.target.checked,
                                    },
                                  }
                                : el
                            )
                          )
                        }
                      />{" "}
                      Right
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedElement.constraints?.top || false}
                        onChange={(e) =>
                          setElements(
                            elements.map((el) =>
                              el.id === selectedIds[0]
                                ? {
                                    ...el,
                                    constraints: {
                                      ...el.constraints,
                                      top: e.target.checked,
                                    },
                                  }
                                : el
                            )
                          )
                        }
                      />{" "}
                      Top
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedElement.constraints?.bottom || false}
                        onChange={(e) =>
                          setElements(
                            elements.map((el) =>
                              el.id === selectedIds[0]
                                ? {
                                    ...el,
                                    constraints: {
                                      ...el.constraints,
                                      bottom: e.target.checked,
                                    },
                                  }
                                : el
                            )
                          )
                        }
                      />{" "}
                      Bottom
                    </label>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Select an element to edit properties
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignStudio;

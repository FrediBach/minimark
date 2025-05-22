import { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Bookmark } from '@/types';

export const useNavigation = () => { // Removed allBookmarks from initial params
  const { groupId: groupIdFromUrl } = useParams<{ groupId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isArchiveView = useMemo(() => location.pathname === '/archive', [location.pathname]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!isArchiveView) {
      setCurrentGroupId(groupIdFromUrl || null);
    } else {
      setCurrentGroupId(null); 
    }
  }, [groupIdFromUrl, isArchiveView]);

  const handleNavigateToGroup = (groupId: string | null) => {
    if (groupId === null) {
      navigate('/');
    } else if (groupId === 'ARCHIVE_VIEW_CRUMB') {
      navigate('/archive');
    } else {
      navigate(`/group/${groupId}`);
    }
  };

  // Breadcrumbs calculation now takes allBookmarks as a direct argument
  const getBreadcrumbs = useCallback((allBookmarks: Bookmark[]) => {
    const crumbs: Array<{ id: string | null; title: string }> = [{ id: null, title: "Top" }];
    if (isArchiveView) {
        crumbs.push({ id: 'ARCHIVE_VIEW_CRUMB', title: "Archive" });
        return crumbs;
    }
    if (currentGroupId === null) {
        return crumbs; 
    }
    
    let tempCurrentId: string | null = currentGroupId;
    const path: Array<{ id: string | null; title: string }> = [];
    while (tempCurrentId) {
        const group = allBookmarks.find(b => b.id === tempCurrentId && b.type === 'group');
        if (group) {
            path.unshift({ id: group.id, title: group.title });
            tempCurrentId = group.parentId;
        } else {
            console.warn(`Breadcrumb generation: Could not find group with ID ${tempCurrentId}`);
            tempCurrentId = null; 
        }
    }
    crumbs.push(...path);
    return crumbs;
  }, [currentGroupId, isArchiveView]);

  return {
    currentGroupId,
    isArchiveView,
    handleNavigateToGroup,
    getBreadcrumbs, // Expose function to get breadcrumbs
    navigate, 
    location, 
  };
};
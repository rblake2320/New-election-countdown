import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Heart, 
  Search, 
  Filter, 
  Star, 
  Calendar, 
  MapPin, 
  Trash2, 
  MoreHorizontal,
  Edit3,
  Bell,
  Share2,
  CheckCircle,
  Clock,
  AlertCircle,
  Tag,
  BarChart3,
  Settings,
  Eye,
  Plus,
  X,
  ChevronDown,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import { CountdownTimer } from "./countdown-timer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatElectionDate, getUrgencyLevel, getUrgencyColor } from "@/lib/election-data";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";

interface WatchlistItem {
  id: number;
  priority: string;
  category?: string;
  status: string;
  tags: string[];
  notes?: string;
  addedVia: string;
  interactionCount: number;
  lastInteraction?: string;
  notificationsEnabled: boolean;
  reminderDaysBefore: number;
  election: {
    id: number;
    title: string;
    subtitle?: string;
    location: string;
    state: string;
    date: string;
    type: string;
    level: string;
    offices?: string[];
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface WatchlistAnalytics {
  totalItems: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  recentlyAdded: number;
  upcomingElections: number;
  completedElections: number;
}

interface RecommendationItem {
  id: number;
  election: WatchlistItem['election'];
  score: number;
  type: string;
  reason: string;
  isPresented: boolean;
  isViewed: boolean;
  isClicked: boolean;
  isAddedToWatchlist: boolean;
  isDismissed: boolean;
}

export function EnhancedUserWatchlist() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'category' | 'recent'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // State for bulk actions
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // State for item editing
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [editForm, setEditForm] = useState({
    priority: '',
    category: '',
    status: '',
    tags: [] as string[],
    notes: '',
    notificationsEnabled: false,
    reminderDaysBefore: 3
  });

  // Fetch enhanced watchlist
  const { data: watchlistData, isLoading, refetch } = useQuery({
    queryKey: ['/api/watchlist/enhanced', {
      search: searchTerm,
      status: statusFilter,
      category: categoryFilter,
      priority: priorityFilter,
      sortBy,
      sortOrder,
      limit: 50,
      offset: 0
    }],
    enabled: !!user && !!token,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter.length) params.append('status', statusFilter.join(','));
      if (categoryFilter.length) params.append('category', categoryFilter.join(','));
      if (priorityFilter.length) params.append('priority', priorityFilter.join(','));
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/watchlist/enhanced?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch enhanced watchlist');
      }
      
      return response.json();
    },
  });

  // Fetch recommendations
  const { data: recommendations = [] } = useQuery({
    queryKey: ['/api/recommendations', { limit: 8 }],
    enabled: !!user && !!token,
    queryFn: async () => {
      const response = await fetch('/api/recommendations?limit=8', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.recommendations || [];
      }
      return [];
    },
  });

  // Update watchlist item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: number; updates: any }) => {
      return apiRequest(`/api/watchlist/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/enhanced'] });
      toast({
        title: "Updated successfully",
        description: "Watchlist item has been updated",
      });
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ itemIds, updates }: { itemIds: number[]; updates: any }) => {
      return apiRequest('/api/watchlist/bulk', {
        method: 'POST',
        body: JSON.stringify({ itemIds, updates }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/enhanced'] });
      setSelectedItems(new Set());
      setShowBulkActions(false);
      toast({
        title: "Bulk update successful",
        description: "Selected items have been updated",
      });
    },
  });

  // Track recommendation interaction
  const trackRecommendation = async (action: string, recommendationId: number, electionId?: number) => {
    try {
      await apiRequest('/api/recommendations/track', {
        method: 'POST',
        body: JSON.stringify({ action, recommendationId, electionId }),
      });
    } catch (error) {
      console.error('Failed to track recommendation:', error);
    }
  };

  // Add recommendation to watchlist
  const addRecommendationToWatchlist = async (recommendation: RecommendationItem) => {
    try {
      await trackRecommendation('click', recommendation.id);
      
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ electionId: recommendation.election.id }),
      });

      if (response.ok) {
        await trackRecommendation('add_to_watchlist', recommendation.id, recommendation.election.id);
        refetch();
        queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
        toast({
          title: "Added to watchlist",
          description: "Election added to your watchlist from recommendations",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add election to watchlist",
        variant: "destructive",
      });
    }
  };

  // Dismiss recommendation
  const dismissRecommendation = async (recommendation: RecommendationItem) => {
    await trackRecommendation('dismiss', recommendation.id);
    queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
    toast({
      title: "Recommendation dismissed",
      description: "We'll improve our suggestions based on your feedback",
    });
  };

  // Handle item selection for bulk actions
  const toggleItemSelection = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  // Handle bulk priority update
  const handleBulkPriorityUpdate = (priority: string) => {
    if (selectedItems.size > 0) {
      bulkUpdateMutation.mutate({
        itemIds: Array.from(selectedItems),
        updates: { priority }
      });
    }
  };

  // Handle bulk category update
  const handleBulkCategoryUpdate = (category: string) => {
    if (selectedItems.size > 0) {
      bulkUpdateMutation.mutate({
        itemIds: Array.from(selectedItems),
        updates: { category }
      });
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = (status: string) => {
    if (selectedItems.size > 0) {
      bulkUpdateMutation.mutate({
        itemIds: Array.from(selectedItems),
        updates: { status }
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (item: WatchlistItem) => {
    setEditingItem(item);
    setEditForm({
      priority: item.priority,
      category: item.category || '',
      status: item.status,
      tags: item.tags,
      notes: item.notes || '',
      notificationsEnabled: item.notificationsEnabled,
      reminderDaysBefore: item.reminderDaysBefore
    });
  };

  // Save item changes
  const saveItemChanges = () => {
    if (editingItem) {
      updateItemMutation.mutate({
        itemId: editingItem.id,
        updates: editForm
      });
      setEditingItem(null);
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return <Clock className="h-4 w-4" />;
      case 'active': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            My Watchlist
          </CardTitle>
          <CardDescription>
            Sign in to save elections you want to track and get personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Create an account to unlock personalized election tracking with intelligent recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            My Watchlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const watchlist = watchlistData?.items || [];
  const analytics = watchlistData?.analytics || {};

  return (
    <div className="space-y-6">
      {/* Header with Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <CardTitle>My Election Watchlist</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <BarChart3 className="h-3 w-3 mr-1" />
                {analytics.totalItems || 0} items
              </Badge>
            </div>
          </div>
          <CardDescription>
            Track your elections with intelligent organization and get personalized recommendations
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="watchlist" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="watchlist" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            My Watchlist ({watchlist.length})
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Recommended ({recommendations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="watchlist" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search your watchlist..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="search-watchlist"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[140px]" data-testid="select-sort">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="recent">Recently Added</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    data-testid="button-sort-order"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant={priorityFilter.includes('high') ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const newFilter = priorityFilter.includes('high') 
                      ? priorityFilter.filter(p => p !== 'high')
                      : [...priorityFilter, 'high'];
                    setPriorityFilter(newFilter);
                  }}
                  data-testid="filter-high-priority"
                >
                  <Star className="h-3 w-3 mr-1" />
                  High Priority
                </Button>
                <Button
                  variant={statusFilter.includes('upcoming') ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const newFilter = statusFilter.includes('upcoming') 
                      ? statusFilter.filter(s => s !== 'upcoming')
                      : [...statusFilter, 'upcoming'];
                    setStatusFilter(newFilter);
                  }}
                  data-testid="filter-upcoming"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Upcoming
                </Button>
                <Button
                  variant={categoryFilter.includes('federal') ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const newFilter = categoryFilter.includes('federal') 
                      ? categoryFilter.filter(c => c !== 'federal')
                      : [...categoryFilter, 'federal'];
                    setCategoryFilter(newFilter);
                  }}
                  data-testid="filter-federal"
                >
                  Federal
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Actions Bar */}
          {showBulkActions && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{selectedItems.size} items selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="bulk-priority">
                          <Star className="h-3 w-3 mr-1" />
                          Set Priority
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleBulkPriorityUpdate('high')}>
                          High Priority
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkPriorityUpdate('medium')}>
                          Medium Priority
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkPriorityUpdate('low')}>
                          Low Priority
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="bulk-category">
                          <Tag className="h-3 w-3 mr-1" />
                          Set Category
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleBulkCategoryUpdate('federal')}>
                          Federal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkCategoryUpdate('state')}>
                          State
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkCategoryUpdate('local')}>
                          Local
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedItems(new Set());
                        setShowBulkActions(false);
                      }}
                      data-testid="button-clear-selection"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Watchlist Items */}
          <div className="space-y-4">
            {watchlist.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Your watchlist is empty</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by adding elections you want to track, or check out our personalized recommendations
                    </p>
                    <Button
                      onClick={() => document.querySelector('[data-value="recommendations"]')?.click()}
                      data-testid="button-view-recommendations"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      View Recommendations
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              watchlist.map((item: WatchlistItem) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                        data-testid={`checkbox-item-${item.id}`}
                      />
                      
                      <div className="flex-1 space-y-3">
                        {/* Header Row */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-lg">{item.election.title}</h4>
                            {item.election.subtitle && (
                              <p className="text-sm text-muted-foreground">{item.election.subtitle}</p>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {item.election.location}
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`menu-item-${item.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(item)}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Election
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`${getPriorityColor(item.priority)} border`}>
                            <Star className="h-3 w-3 mr-1" />
                            {item.priority} priority
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getStatusIcon(item.status)}
                            {item.status}
                          </Badge>
                          <Badge variant="outline">{item.election.type}</Badge>
                          <Badge variant="outline">{item.election.level}</Badge>
                          {item.category && (
                            <Badge variant="secondary">
                              <Tag className="h-3 w-3 mr-1" />
                              {item.category}
                            </Badge>
                          )}
                        </div>

                        {/* Tags */}
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Notes */}
                        {item.notes && (
                          <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                            {item.notes}
                          </p>
                        )}

                        {/* Footer Row */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <CountdownTimer 
                            targetDate={item.election.date} 
                            size="sm"
                            className="text-sm"
                          />
                          <div className="flex items-center gap-2">
                            {item.notificationsEnabled && (
                              <Badge variant="outline" className="text-xs">
                                <Bell className="h-3 w-3 mr-1" />
                                Reminders On
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Added {formatElectionDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Personalized Recommendations
              </CardTitle>
              <CardDescription>
                Based on your location, interests, and watchlist preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No recommendations available</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete your profile preferences to get personalized election recommendations
                  </p>
                  <Button variant="outline" data-testid="button-setup-preferences">
                    <Settings className="h-4 w-4 mr-2" />
                    Setup Preferences
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {recommendations.map((rec: RecommendationItem) => (
                    <Card key={rec.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">{rec.election.title}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {rec.election.location}
                              </div>
                            </div>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {Math.round(rec.score)}% match
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{rec.election.type}</Badge>
                            <Badge variant="outline">{rec.election.level}</Badge>
                            <Badge variant="outline" className="text-xs">
                              {rec.type.replace('_', ' ')}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            <strong>Why this matches:</strong> {rec.reason}
                          </p>

                          <CountdownTimer 
                            targetDate={rec.election.date} 
                            size="sm"
                            className="text-sm"
                          />

                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => addRecommendationToWatchlist(rec)}
                              data-testid={`add-recommendation-${rec.id}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add to Watchlist
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => dismissRecommendation(rec)}
                              data-testid={`dismiss-recommendation-${rec.id}`}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-[425px]" data-testid="dialog-edit-item">
          <DialogHeader>
            <DialogTitle>Edit Watchlist Item</DialogTitle>
            <DialogDescription>
              Update the organization and settings for this election
            </DialogDescription>
          </DialogHeader>
          
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={editForm.priority} onValueChange={(value) => setEditForm({...editForm, priority: value})}>
                  <SelectTrigger data-testid="select-edit-priority">
                    <SelectValue placeholder="Set priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={editForm.category} onValueChange={(value) => setEditForm({...editForm, category: value})}>
                  <SelectTrigger data-testid="select-edit-category">
                    <SelectValue placeholder="Set category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="federal">Federal</SelectItem>
                    <SelectItem value="state">State</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                  placeholder="Add personal notes about this election..."
                  data-testid="textarea-edit-notes"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editForm.notificationsEnabled}
                  onCheckedChange={(checked) => setEditForm({...editForm, notificationsEnabled: checked})}
                  data-testid="switch-edit-notifications"
                />
                <Label htmlFor="notifications">Enable reminders</Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveItemChanges} disabled={updateItemMutation.isPending} data-testid="button-save-changes">
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditingItem(null)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
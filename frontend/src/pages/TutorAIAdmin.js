import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, FileText, Download, Upload, Play, Loader2, 
  CheckCircle, XCircle, RefreshCw, Youtube, Sparkles,
  BookOpen, GraduationCap, Languages, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '../services/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TutorAIAdmin = () => {
  // Form state
  const [conceptName, setConceptName] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [language, setLanguage] = useState('Telugu');
  const [avatarStyle, setAvatarStyle] = useState('male_teacher');
  
  // Generated content state
  const [script, setScript] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  
  // Video generation state
  const [videoId, setVideoId] = useState(null);
  const [videoStatus, setVideoStatus] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);
  
  // Quiz state
  const [quizPdfUrl, setQuizPdfUrl] = useState(null);
  
  // Batch processing state
  const [batchFile, setBatchFile] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  
  // Generated videos list
  const [generatedVideos, setGeneratedVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  
  // Config
  const [config, setConfig] = useState(null);
  
  const pollIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load config and videos on mount
  useEffect(() => {
    loadConfig();
    loadGeneratedVideos();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/tutorai/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadGeneratedVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const response = await api.get('/tutorai/videos');
      setGeneratedVideos(response.data.videos || []);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Generate Script
  const handleGenerateScript = async () => {
    if (!conceptName || !classLevel || !subject) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsGeneratingScript(true);
    setScript('');
    setVideoId(null);
    setVideoUrl(null);
    setVideoStatus(null);
    setQuizPdfUrl(null);

    try {
      const response = await api.post('/tutorai/generate-script', {
        concept_name: conceptName,
        class_level: classLevel,
        subject: subject,
        language: language
      });

      if (response.data.success) {
        setScript(response.data.script);
        toast.success('Script generated successfully!');
      } else {
        toast.error(response.data.error || 'Failed to generate script');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate script');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Generate Video
  const handleGenerateVideo = async () => {
    if (!script) {
      toast.error('Please generate a script first');
      return;
    }

    setIsGeneratingVideo(true);
    setVideoProgress(0);
    setVideoStatus('initiating');

    try {
      const response = await api.post('/tutorai/generate-video', {
        script: script,
        language: language,
        avatar_style: avatarStyle,
        concept_name: conceptName,
        class_level: classLevel,
        subject: subject
      });

      if (response.data.success) {
        setVideoId(response.data.video_id);
        setVideoStatus('processing');
        toast.success('Video generation started!');
        
        // Start polling for status
        startStatusPolling(response.data.video_id);
      } else {
        toast.error(response.data.error || 'Failed to start video generation');
        setIsGeneratingVideo(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate video');
      setIsGeneratingVideo(false);
    }
  };

  // Poll video status
  const startStatusPolling = (vid) => {
    let progress = 10;
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/tutorai/video-status/${vid}`);
        
        if (response.data.success) {
          const status = response.data.status;
          setVideoStatus(status);
          
          if (status === 'completed') {
            setVideoUrl(response.data.video_url);
            setVideoProgress(100);
            setIsGeneratingVideo(false);
            clearInterval(pollIntervalRef.current);
            toast.success('Video generated successfully!');
            loadGeneratedVideos();
          } else if (status === 'failed') {
            setIsGeneratingVideo(false);
            clearInterval(pollIntervalRef.current);
            toast.error(response.data.error || 'Video generation failed');
          } else {
            // Increment progress slowly while processing
            progress = Math.min(progress + 5, 90);
            setVideoProgress(progress);
          }
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 15000); // Poll every 15 seconds
  };

  // Generate Quiz PDF
  const handleGenerateQuiz = async () => {
    if (!script) {
      toast.error('Please generate a script first');
      return;
    }

    setIsGeneratingQuiz(true);

    try {
      const response = await api.post('/tutorai/generate-quiz-pdf', {
        script: script,
        concept_name: conceptName,
        class_level: classLevel,
        subject: subject,
        language: language
      });

      if (response.data.success) {
        setQuizPdfUrl(`${API_URL}/api/tutorai/download-pdf/${response.data.pdf_filename}`);
        toast.success('Quiz PDF generated!');
      } else {
        toast.error(response.data.error || 'Failed to generate quiz');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate quiz');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Handle CSV batch upload
  const handleBatchUpload = async () => {
    if (!batchFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsProcessingBatch(true);
    setBatchResults([]);

    try {
      const formData = new FormData();
      formData.append('file', batchFile);

      const response = await api.post('/tutorai/batch-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setBatchResults(response.data.results || []);
        toast.success(`Processed ${response.data.processed} concepts`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Batch processing failed');
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Update video YouTube status
  const handleMarkUploaded = async (videoDocId, youtubeUrl) => {
    try {
      await api.put(`/tutorai/videos/${videoDocId}`, {
        youtube_uploaded: true,
        youtube_url: youtubeUrl
      });
      toast.success('Video marked as uploaded');
      loadGeneratedVideos();
    } catch (error) {
      toast.error('Failed to update video');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'script_ready':
        return <Badge className="bg-yellow-500"><FileText className="w-3 h-3 mr-1" />Script Ready</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TutorAI Admin</h1>
              <p className="text-gray-600">Generate AI Educational Videos</p>
            </div>
          </div>
          
          {/* Config Status */}
          {config && (
            <div className="flex gap-2 mt-4">
              <Badge variant={config.llm_configured ? "default" : "destructive"}>
                {config.llm_configured ? '✓' : '✗'} LLM API
              </Badge>
              <Badge variant={config.heygen_configured ? "default" : "destructive"}>
                {config.heygen_configured ? '✓' : '✗'} HeyGen API
              </Badge>
            </div>
          )}
        </div>

        <Tabs defaultValue="single" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="single">Single Video</TabsTrigger>
            <TabsTrigger value="batch">Batch Upload</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Single Video Generation */}
          <TabsContent value="single">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Input Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Video Details
                  </CardTitle>
                  <CardDescription>Enter concept details to generate educational content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Concept Name *</Label>
                    <Input
                      placeholder="e.g., Photosynthesis, Quadratic Equations"
                      value={conceptName}
                      onChange={(e) => setConceptName(e.target.value)}
                      data-testid="concept-name-input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <GraduationCap className="w-4 h-4" />
                        Class Level *
                      </Label>
                      <Select value={classLevel} onValueChange={setClassLevel}>
                        <SelectTrigger data-testid="class-level-select">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {config?.class_levels?.map(level => (
                            <SelectItem key={level} value={level}>{level}</SelectItem>
                          )) || [...Array(10)].map((_, i) => (
                            <SelectItem key={i} value={`Class ${i + 1}`}>Class {i + 1}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger data-testid="subject-select">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {(config?.subjects || ['Science', 'Maths', 'Telugu', 'Social', 'English']).map(subj => (
                            <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Languages className="w-4 h-4" />
                        Language
                      </Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger data-testid="language-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(config?.languages || ['Telugu', 'Hindi', 'English']).map(lang => (
                            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Avatar Style
                      </Label>
                      <Select value={avatarStyle} onValueChange={setAvatarStyle}>
                        <SelectTrigger data-testid="avatar-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(config?.avatar_styles || [
                            { id: 'male_teacher', name: 'Male Teacher' },
                            { id: 'female_teacher', name: 'Female Teacher' }
                          ]).map(style => (
                            <SelectItem key={style.id} value={style.id}>{style.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
                    onClick={handleGenerateScript}
                    disabled={isGeneratingScript || !conceptName || !classLevel || !subject}
                    data-testid="generate-script-btn"
                  >
                    {isGeneratingScript ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Script...</>
                    ) : (
                      <><FileText className="w-4 h-4 mr-2" />Generate Script</>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Script Output */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Generated Script
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Script will appear here after generation..."
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                    data-testid="script-textarea"
                  />

                  {script && (
                    <div className="space-y-3">
                      {/* Video Generation */}
                      {!videoUrl && (
                        <Button 
                          className="w-full bg-gradient-to-r from-red-500 to-pink-500"
                          onClick={handleGenerateVideo}
                          disabled={isGeneratingVideo || !config?.heygen_configured}
                          data-testid="generate-video-btn"
                        >
                          {isGeneratingVideo ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Video...</>
                          ) : (
                            <><Video className="w-4 h-4 mr-2" />Generate Video</>
                          )}
                        </Button>
                      )}

                      {/* Progress Bar */}
                      {isGeneratingVideo && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Video Generation Progress</span>
                            <span>{videoProgress}%</span>
                          </div>
                          <Progress value={videoProgress} className="h-2" />
                          <p className="text-xs text-gray-500 text-center">
                            {videoStatus === 'processing' ? 'Processing... This may take 5-10 minutes' : videoStatus}
                          </p>
                        </div>
                      )}

                      {/* Video Download */}
                      {videoUrl && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 text-green-700 mb-3">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-semibold">Video Ready!</span>
                          </div>
                          <Button 
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={() => window.open(videoUrl, '_blank')}
                            data-testid="download-video-btn"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Video
                          </Button>
                        </div>
                      )}

                      {/* Quiz PDF Generation */}
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={handleGenerateQuiz}
                        disabled={isGeneratingQuiz}
                        data-testid="generate-quiz-btn"
                      >
                        {isGeneratingQuiz ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Quiz...</>
                        ) : (
                          <><FileText className="w-4 h-4 mr-2" />Generate Quiz PDF</>
                        )}
                      </Button>

                      {quizPdfUrl && (
                        <Button 
                          variant="secondary"
                          className="w-full"
                          onClick={() => window.open(quizPdfUrl, '_blank')}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Quiz PDF
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Batch Upload */}
          <TabsContent value="batch">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Batch Upload
                </CardTitle>
                <CardDescription>
                  Upload CSV with columns: concept_name, class_level, subject, language
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={(e) => setBatchFile(e.target.files?.[0])}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleBatchUpload}
                    disabled={!batchFile || isProcessingBatch}
                  >
                    {isProcessingBatch ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" />Process CSV</>
                    )}
                  </Button>
                </div>

                {/* Batch Results */}
                {batchResults.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-3 text-left">Concept</th>
                          <th className="p-3 text-left">Class</th>
                          <th className="p-3 text-left">Subject</th>
                          <th className="p-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((result, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-3">{result.concept_name}</td>
                            <td className="p-3">{result.class_level}</td>
                            <td className="p-3">{result.subject}</td>
                            <td className="p-3">{getStatusBadge(result.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      Generated Videos
                    </CardTitle>
                    <CardDescription>All generated videos and their status</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadGeneratedVideos}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingVideos ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingVideos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : generatedVideos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No videos generated yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {generatedVideos.map((video) => (
                      <div key={video.id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{video.concept_name}</h4>
                            <p className="text-sm text-gray-600">
                              {video.class_level} • {video.subject} • {video.language}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(video.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(video.status)}
                            {video.youtube_uploaded && (
                              <Badge className="bg-red-500">
                                <Youtube className="w-3 h-3 mr-1" />
                                Uploaded
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {video.status === 'completed' && (
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              onClick={() => window.open(video.download_url, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                            {!video.youtube_uploaded && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const url = prompt('Enter YouTube URL:');
                                  if (url) handleMarkUploaded(video.id, url);
                                }}
                              >
                                <Youtube className="w-4 h-4 mr-1" />
                                Mark Uploaded
                              </Button>
                            )}
                            {video.youtube_url && (
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => window.open(video.youtube_url, '_blank')}
                              >
                                <Play className="w-4 h-4 mr-1" />
                                View on YouTube
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TutorAIAdmin;

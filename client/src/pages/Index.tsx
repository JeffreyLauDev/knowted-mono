
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import { ArrowRight, FileCheck, Zap, MessageSquare, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <Layout>
      <div className="container mx-auto px-4">
        <section className="py-20 text-center animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <img 
              src="/lovable-uploads/e2b3d1a5-1625-4e5f-945e-0e77f0b625c8.png" 
              alt="Joe, your AI meeting assistant" 
              className="h-40 md:h-48 mb-6"
            />
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Meet <span className="text-primary">Joe</span>, Your AI<br />
              Meeting Assistant
            </h1>
          </div>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Transcription tools like Fireflies and Otter are great for recording meetings, 
            but finding specific information later can be challenging. 
            Joe remembers everything and makes your meeting content accessible from anywhere.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        <section className="py-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How Joe Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Joe integrates with your favorite transcription tools and makes meeting content accessible across all your communication channels
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                <FileCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Collect</h3>
              <p className="text-muted-foreground">
                Joe feeds on meeting minutes from Fireflies, Otter, and other transcription tools
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Remember</h3>
              <p className="text-muted-foreground">
                Joe remembers everything and makes your meeting content easily searchable
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 shadow-sm border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Respond</h3>
              <p className="text-muted-foreground">
                Ask Joe questions in Teams, WhatsApp, Slack, WeChat, and more
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/50 rounded-lg my-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4">Access Meeting Content Anywhere</h2>
                <p className="text-muted-foreground mb-6">
                  Joe makes your meeting transcripts accessible across all your communication platforms. 
                  No more hunting through folders or searching email for that important detail someone mentioned.
                </p>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Microsoft Teams</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>Slack</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>WeChat</span>
                  </div>
                </div>
              </div>
              <div className="bg-card p-6 rounded-lg border shadow-md">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">U</div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm">Hey Joe, what did Sarah say about the Q3 marketing budget in yesterday's meeting?</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold">J</div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p className="text-sm">In yesterday's budget meeting, Sarah mentioned that the Q3 marketing budget would be increased by 15% to support the new product launch in August. She specifically allocated an extra $25,000 for digital campaigns.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to never lose track of meeting information again?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            Join teams that use Joe to make their meeting content accessible and actionable
          </p>
          <Button size="lg" onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
            {isAuthenticated ? 'Go to Dashboard' : 'Start for Free'}
          </Button>
        </section>
      </div>
    </Layout>
  );
};

export default Index;

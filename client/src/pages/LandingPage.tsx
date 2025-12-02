import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Bell, Shield, Loader2 } from "lucide-react";

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold" data-testid="text-logo">Personal CRM</h1>
          <Button 
            onClick={handleLogin} 
            disabled={isLoading}
            data-testid="button-login"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Войти"}
          </Button>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-3xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6" data-testid="text-hero-title">
              Управляйте отношениями эффективно
            </h2>
            <p className="text-xl text-muted-foreground mb-8" data-testid="text-hero-description">
              Персональная CRM для тех, кто ценит свою сеть контактов. 
              Отслеживайте связи, получайте напоминания и развивайте важные отношения.
            </p>
            <Button 
              size="lg" 
              onClick={handleLogin}
              disabled={isLoading}
              data-testid="button-get-started"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                "Начать бесплатно"
              )}
            </Button>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto">
            <h3 className="text-2xl font-bold text-center mb-12" data-testid="text-features-title">
              Возможности
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover-elevate" data-testid="card-feature-contacts">
                <CardHeader className="pb-3">
                  <Users className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">Контакты</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Храните информацию о контактах, добавляйте теги и роли для удобной организации.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-feature-scoring">
                <CardHeader className="pb-3">
                  <TrendingUp className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">Скоринг</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Оценивайте вклад и потенциал каждого контакта для приоритизации внимания.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-feature-heatindex">
                <CardHeader className="pb-3">
                  <Bell className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">Heat Index</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Автоматические напоминания о контактах, которые требуют внимания.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="hover-elevate" data-testid="card-feature-teams">
                <CardHeader className="pb-3">
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle className="text-lg">Команды</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Работайте над контактами вместе с коллегами в общем пространстве.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto text-center max-w-2xl">
            <h3 className="text-2xl font-bold mb-4" data-testid="text-cta-title">
              Готовы начать?
            </h3>
            <p className="text-muted-foreground mb-8">
              Войдите через Replit и начните отслеживать свои контакты уже сегодня.
            </p>
            <Button 
              size="lg" 
              onClick={handleLogin}
              disabled={isLoading}
              data-testid="button-cta-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                "Войти через Replit"
              )}
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Personal CRM © 2024
        </div>
      </footer>
    </div>
  );
}

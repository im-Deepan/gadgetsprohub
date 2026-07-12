import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# We want to wrap all unprotected lazy components in App.tsx renderActiveView with <Suspense fallback={<ViewLoader />}>
# We'll just replace the whole switch statement.

# Find the start of renderActiveView
start_idx = content.find("const renderActiveView = () => {")
end_idx = content.find("};", start_idx) + 2

# We'll just extract it and replace it.
new_switch = """  const renderActiveView = () => {
    let content = null;
    switch (activeView) {
      case 'home':
        content = <Home onNavigate={navigateToView} onPreload={preloadView} />;
        break;
      case 'products':
        content = (
          <Suspense fallback={<ProductPageSkeleton />}>
            <ProductList initialFilter={selectedSlug} onNavigate={navigateToView} onPreload={preloadView} />
          </Suspense>
        );
        break;
      case 'product-detail':
        content = (
          <Suspense fallback={<ProductPageSkeleton />}>
            <ProductDetail productSlug={selectedSlug || ''} onNavigate={navigateToView} />
          </Suspense>
        );
        break;
      case 'blogs':
        content = (
          <Suspense fallback={<BlogPageSkeleton />}>
            <BlogList onNavigate={navigateToView} onPreload={preloadView} />
          </Suspense>
        );
        break;
      case 'blog-detail':
        content = <BlogDetail blogSlug={selectedSlug || ''} onNavigate={navigateToView} />;
        break;
      case 'contact':
        content = <Contact />;
        break;
      case 'login':
        content = <Login onNavigate={navigateToView} />;
        break;
      case 'profile':
        content = <Profile onNavigate={navigateToView} />;
        break;
      case 'admin':
        content = <Admin onNavigate={navigateToView} />;
        break;
      case 'privacy-policy':
        content = <PrivacyPolicy />;
        break;
      case 'about-us':
        content = <AboutUs />;
        break;
      case 'terms-conditions':
        content = <TermsConditions />;
        break;
      case 'disclaimer':
        content = <Disclaimer />;
        break;
      default:
        content = (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
            <button onClick={() => navigateToView('home')} className="bg-indigo-500 text-white px-6 py-2 rounded-lg">Return Home</button>
          </div>
        );
        break;
    }
    
    // We only wrap it in ViewLoader if it doesn't already have its own Suspense (which are the cases where content is wrapped in Suspense)
    // Actually, we can just wrap EVERYTHING in ViewLoader that doesn't have it.
    // Since ProductList and others already have Suspense in their JSX, they won't trigger the outer Suspense unless they suspend outside it, which they don't.
    // So we can safely return <Suspense fallback={<ViewLoader />}>{content}</Suspense>;
    
    return <Suspense fallback={<ViewLoader />}>{content}</Suspense>;
  };
"""

# Wait, let's just use regex to replace it
new_content = content[:start_idx] + new_switch + content[content.find("  return (", start_idx):]

with open('src/App.tsx', 'w') as f:
    f.write(new_content)

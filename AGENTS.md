<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the landing-page UNMESS intro as a client-rendered canvas effect with a stable reserved height, because animation failure must not shift or blank the primary input experience.
- Present the canvas intro in a session-once overlay above the mounted home page, with completion, skip and timeout exits; defer guest onboarding until it closes so the input remains reachable.

# Upload to GitHub

The package already contains a local Git history and milestone branches. Add the existing GitHub repository as the remote:

```powershell
git remote add origin https://github.com/DevRamiz/ExamApp.git
git push -u origin main
git push -u origin dev
git push origin --all
```

If `origin` already exists:

```powershell
git remote set-url origin https://github.com/DevRamiz/ExamApp.git
git push -u origin main
git push -u origin dev
git push origin --all
```

Before pushing over an older repository, create a backup branch there or use a new repository. Do not use `--force` unless you intentionally want to replace its history.

#!/bin/sh

set -x

git remote add volto https://github.com/plone/volto.git
#git remote add tiberiuichim https://github.com/tiberiuichim/volto.git

git fetch --all
git pull
git merge --no-ff volto/export_components
git merge --no-ff origin/sync_update
git merge --no-ff origin/navigation-refactoring
git merge --no-ff volto/eea-dx-fields-validation
git merge --no-ff volto/eea-dx-cpanel-layout
git merge --no-ff volto/addon_less_loader
git merge --no-ff volto/default-block-rebased
git merge --no-ff volto/master

# To come:

# git merge origin/error_toast
# git merge tibi/sync_render_kitchensink

# Already merged to Volto master
# git merge volto/wysiwyg_desc_styling
# git merge volto/disable_submit
# git merge volto/fix_querystring_ssr_edit
# git merge volto/fix_querystring_missing_value
# git merge volto/fix_querystring_child_warning
# git merge tiberiuichim/navigation-refactoring
# git merge volto/eea-controlpanel-dx
# git merge origin/eea-default-blocks

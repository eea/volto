#!/bin/sh

set -x

git remote add volto https://github.com/plone/volto.git
#git remote add tiberiuichim https://github.com/tiberiuichim/volto.git

git fetch --all
git pull

git merge volto/master
git merge volto/export_components

# this will conflict with https://github.com/plone/volto/pull/1705

# this add minimizeNetworkFetch option
# git merge origin/sync_update
# git merge origin/navigation-refactoring

git merge volto/eea-dx-fields-validation
git merge volto/eea-dx-cpanel-layout

# needed for volto-slate
git merge volto/separate_less_loader

# needed by volto-slate
git merge volto/form_context_clean_breaking_with_hoc

# needed for bise
git merge volto/addons_customize
git merge volto/safe_apply_config

# To come:

# git merge origin/error_toast
# git merge tibi/sync_render_kitchensink

# Already merged to Volto master
# git merge --no-ff volto/default-block-rebased
# git merge --no-ff volto/fix_toolbar_ssr
# git merge volto/wysiwyg_desc_styling
# git merge volto/disable_submit
# git merge volto/fix_querystring_ssr_edit
# git merge volto/fix_querystring_missing_value
# git merge volto/fix_querystring_child_warning
# git merge tiberiuichim/navigation-refactoring
# git merge volto/eea-controlpanel-dx
# git merge origin/eea-default-blocks

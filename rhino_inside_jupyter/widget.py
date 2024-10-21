#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Maryanne Wachter.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

from ipywidgets import DOMWidget, ValueWidget, register, widgets
from traitlets import Unicode, Dict
import rhino3dm
import base64
from ._frontend import module_name, module_version

@register
class Rhino3dmWidget(DOMWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('Rhino3dmModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)

    _view_name = Unicode('Rhino3dmView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    rhino_file = Unicode('').tag(sync=True)
    widget_params = Dict({}).tag(sync=True)

    def __init__(self, rhino_file_path, width=800, height=600, *args, **kwargs):
        super().__init__(*args, **kwargs)

        with open(rhino_file_path, 'rb') as file:
            self.rhino_file = base64.b64encode(file.read()).decode('utf-8')
        self.widget_params = {
            'width': width,
            'height': height
        }
